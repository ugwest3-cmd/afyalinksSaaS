import { WAMessage } from '@whiskeysockets/baileys';
import { logger } from '../../config/logger.js';
import { supabaseAdmin } from '../../config/supabase.js';
import { GoogleGenAI, Type } from '@google/genai';
import { orderService } from '../order.service.js';
import { paymentService } from '../pesapal/payment.service.js';
import { WhatsAppManager } from './manager.js';
import { env } from '../../config/env.js';

// Initialize Gemini Client
// We assume GEMINI_API_KEY is available in the environment.
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const handleIncomingMessage = async (sessionId: string, message: WAMessage) => {
    try {
        const jid = message.key.remoteJid;
        if (!jid || jid === 'status@broadcast') return;

        const senderPhone = jid.split('@')[0];
        const isFromPharmacy = message.key.fromMe === true;

        const messageText = message.message?.conversation || 
                            message.message?.extendedTextMessage?.text || 
                            message.message?.imageMessage?.caption || 
                            '';
                            
        const quotedText = message.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation || '';

        if (!messageText) return;

        logger.info(`[Gemini Processing] Message on ${sessionId} (fromMe: ${isFromPharmacy}): ${messageText.substring(0, 50)}...`);

        // 1. Find pharmacy
        const { data: accountData } = await supabaseAdmin
            .from('whatsapp_accounts')
            .select('pharmacy_id')
            .eq('session_id', sessionId)
            .single();

        if (!accountData) return;
        const pharmacyId = accountData.pharmacy_id;

        // 2. Use Gemini 2.5 Flash to classify intent and extract data
        let systemPrompt = `You are an AI assistant for Afya Links, a wholesale pharmacy ordering platform.
Your job is to analyze a WhatsApp message and determine if it is a NEW_ORDER from a clinic, or a PRICE_ASSIGNMENT from the pharmacy.

Rules:
- If the message contains a list of medicines, it is a NEW_ORDER.
- If the message contains a total price (e.g., "TOTAL 850000", "50k", "the price is 15000"), it is a PRICE_ASSIGNMENT.
- Extract the order number (e.g. AFY-XXXX-XXXXXX) if it appears in the message or the quoted message context.
- Extract the price amount as a raw number if it's a PRICE_ASSIGNMENT.`;

        try {
            const { data } = await supabaseAdmin
                .from('system_settings')
                .select('system_prompt')
                .eq('id', 1)
                .single();
            if (data?.system_prompt) systemPrompt = data.system_prompt;
        } catch (e) {
            // Ignore, use default
        }

        const prompt = `${systemPrompt}

Message context:
Sender is Pharmacy: ${isFromPharmacy}
Message Text: "${messageText}"
Quoted Message (if any): "${quotedText}"`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        intent: {
                            type: Type.STRING,
                            description: "Must be exactly 'NEW_ORDER' or 'PRICE_ASSIGNMENT' or 'UNKNOWN'"
                        },
                        orderNumber: {
                            type: Type.STRING,
                            description: "The order number (e.g. AFY-2026-000123) if present in the message or quoted text"
                        },
                        amount: {
                            type: Type.NUMBER,
                            description: "The price amount extracted from the message, if it's a price assignment"
                        }
                    },
                    required: ["intent"]
                }
            }
        });

        const resultText = response.text;
        if (!resultText) throw new Error("Gemini returned empty response");
        
        const analysis = JSON.parse(resultText);
        logger.info(`[Gemini Analysis] ${JSON.stringify(analysis)}`);

        // 3. Handle based on intent
        if (analysis.intent === 'PRICE_ASSIGNMENT' && analysis.amount && isFromPharmacy) {
            // Pharmacy is setting the price
            if (!analysis.orderNumber) {
                await WhatsAppManager.getInstance().sendMessage(sessionId, jid, "I couldn't identify the order number. Please reply directly to the order message with the total price.");
                return;
            }

            // Look up the order ID by order_number
            const order = await orderService.getOrderByNumber(analysis.orderNumber);
            if (!order) {
                await WhatsAppManager.getInstance().sendMessage(sessionId, jid, `Could not find order ${analysis.orderNumber}.`);
                return;
            }

            // Update order amount
            await orderService.updateOrderAmount(order.id, analysis.amount);

            // Generate payment link
            const paymentLink = await paymentService.getPaymentRedirectUrl(order.order_number);

            // Send link back to the clinic's phone number!
            // Wait, we need the clinic's phone number
            const clinicPhone = order.customer_phone;
            const msgToClinic = `Your order ${order.order_number} has been reviewed by the pharmacy.

Total Amount: UGX ${analysis.amount.toLocaleString()}

Please complete your payment securely here:
${paymentLink}`;
            
            await WhatsAppManager.getInstance().sendMessage(sessionId, `${clinicPhone}@s.whatsapp.net`, msgToClinic);
            
            // Confirm to pharmacy
            await WhatsAppManager.getInstance().sendMessage(sessionId, jid, `✅ Price of UGX ${analysis.amount.toLocaleString()} set for ${order.order_number}. Payment link has been sent to the clinic.`);
            
        } else if (analysis.intent === 'NEW_ORDER' && !isFromPharmacy) {
            // Clinic is placing a new order
            let { data: clinicData } = await supabaseAdmin
                .from('clinics')
                .select('id')
                .eq('phone_number', senderPhone)
                .single();

            if (!clinicData) {
                const { data: newClinic } = await supabaseAdmin
                    .from('clinics')
                    .insert({ phone_number: senderPhone, name: `Clinic ${senderPhone}` })
                    .select('id')
                    .single();
                clinicData = newClinic;
            }

            // Create Order
            const order = await orderService.createOrder({
                pharmacyId,
                clinicPhone: senderPhone,
                whatsappAccountId: sessionId,
                originalMessage: messageText
            });
            
            // Save attachment if image
            // Note: For MVP, skipping complex media downloading, just noting it
            
            // Notify pharmacy owner (replying to the chat)
            const notifyMsg = `🛒 *NEW AFYA LINKS ORDER*
Order: ${order.order_number}
Clinic: ${senderPhone}

Details:
${messageText}

*Please review the order and reply with the total price (e.g. "TOTAL 50000").*
(Make sure to reply directly to this message so I know which order it is!)`;
            
            await WhatsAppManager.getInstance().sendMessage(sessionId, jid, notifyMsg);
        } else {
            logger.info("Message was categorized as UNKNOWN or ignored due to fromMe mismatch.");
        }

    } catch (error) {
        logger.error(error, `Error in Gemini handleIncomingMessage for session ${sessionId}:`);
    }
};
