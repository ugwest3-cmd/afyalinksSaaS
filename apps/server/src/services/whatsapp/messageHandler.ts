import { WAMessage } from '@whiskeysockets/baileys';
import { logger } from '../../config/logger.js';
import { supabaseAdmin } from '../../config/supabase.js';
import { GoogleGenAI, Type } from '@google/genai';
import { orderService } from '../order.service.js';
import { paymentService } from '../pesapal/payment.service.js';
import { WhatsAppManager } from './manager.js';

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Helper to save chat log without throwing
async function saveChatLog(phoneNumber: string, sessionId: string, role: string, content: string) {
    const { error } = await supabaseAdmin.from('chat_logs').insert({
        phone_number: phoneNumber,
        session_id: sessionId,
        role,
        content
    });
    if (error) logger.error(error, 'Failed to save chat log');
}

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

        // 2. Fetch or Create Clinic (if message is from a clinic)
        let clinicData: any = null;
        let isOnboarding = false;

        if (!isFromPharmacy) {
            const { data } = await supabaseAdmin
                .from('clinics')
                .select('*')
                .eq('phone_number', senderPhone)
                .single();
            
            clinicData = data;

            if (!clinicData) {
                const { data: newClinic } = await supabaseAdmin
                    .from('clinics')
                    .insert({ phone_number: senderPhone, name: `Clinic ${senderPhone}`, status: 'PENDING' })
                    .select('*')
                    .single();
                clinicData = newClinic;
            }

            // Check if onboarding is complete by looking for driver name
            isOnboarding = !clinicData?.preferred_driver_name;

            // Save incoming message to chat history
            await saveChatLog(senderPhone, sessionId, 'user', messageText);
        }

        // Fetch dynamic system prompt
        let systemPrompt = `You are an AI assistant for Afya Links, a wholesale pharmacy ordering platform.
Your job is to analyze a WhatsApp message and classify it.`;

        try {
            const { data } = await supabaseAdmin
                .from('system_settings')
                .select('system_prompt')
                .eq('id', 1)
                .single();
            if (data?.system_prompt) systemPrompt = data.system_prompt;
        } catch (e) {
            // Ignore
        }

        let historyContents: any[] = [];
        
        if (isOnboarding && !isFromPharmacy) {
            systemPrompt += `
            
The clinic sending this message is currently ONBOARDING.
Your task is to have a polite, conversational chat with them to collect the following information one by one:
1. Their actual Clinic Name
2. Their Location
3. If they want to connect any additional phone numbers (they can add up to 3 more phones for their staff).
4. Their preferred driver/taxi details (Driver Name and Driver Phone Number) who knows their location for deliveries.

Do not ask for everything at once. Ask one or two questions at a time.
If you need to ask them a question, use the CONVERSATIONAL_REPLY intent and provide the 'replyText'.
If you have successfully collected ALL the required information across the chat history, use the ONBOARDING_COMPLETE intent and extract all the data into the 'clinicDetails' object.
`;
            try {
                // Fetch last 10 messages
                const { data: logs } = await supabaseAdmin
                    .from('chat_logs')
                    .select('role, content')
                    .eq('phone_number', senderPhone)
                    .order('created_at', { ascending: false })
                    .limit(10);
                
                if (logs) {
                    historyContents = logs.reverse().map((l: any) => ({
                        role: l.role === 'model' ? 'model' : 'user',
                        parts: [{ text: l.content }]
                    }));
                }
            } catch (e) {}
        }

        if (historyContents.length === 0) {
            historyContents = [
                { role: 'user', parts: [{ text: `Message Context:\nSender is Pharmacy: ${isFromPharmacy}\nMessage Text: "${messageText}"\nQuoted Message: "${quotedText}"` }] }
            ];
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: historyContents,
            config: {
                systemInstruction: systemPrompt,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        intent: {
                            type: Type.STRING,
                            description: "Must be 'NEW_ORDER', 'PRICE_ASSIGNMENT', 'CONVERSATIONAL_REPLY', 'ONBOARDING_COMPLETE', or 'UNKNOWN'"
                        },
                        replyText: {
                            type: Type.STRING,
                            description: "The natural language reply to send back to the user if intent is CONVERSATIONAL_REPLY"
                        },
                        orderNumber: {
                            type: Type.STRING,
                            description: "The order number if present in the quoted message"
                        },
                        amount: {
                            type: Type.NUMBER,
                            description: "The price amount extracted"
                        },
                        clinicDetails: {
                            type: Type.OBJECT,
                            properties: {
                                clinicName: { type: Type.STRING },
                                location: { type: Type.STRING },
                                driverName: { type: Type.STRING },
                                driverPhone: { type: Type.STRING },
                                additionalPhones: { 
                                    type: Type.ARRAY, 
                                    items: { type: Type.STRING } 
                                }
                            }
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
        if (analysis.intent === 'CONVERSATIONAL_REPLY' && analysis.replyText && !isFromPharmacy) {
            await WhatsAppManager.getInstance().sendMessage(sessionId, jid, analysis.replyText);
            
            // Save bot reply to history
            await saveChatLog(senderPhone, sessionId, 'model', analysis.replyText);
            
        } else if (analysis.intent === 'ONBOARDING_COMPLETE' && analysis.clinicDetails && !isFromPharmacy) {
            
            // Update Clinic in DB
            await supabaseAdmin.from('clinics').update({
                name: analysis.clinicDetails.clinicName,
                location: analysis.clinicDetails.location,
                preferred_driver_name: analysis.clinicDetails.driverName,
                preferred_driver_phone: analysis.clinicDetails.driverPhone,
                additional_phones: analysis.clinicDetails.additionalPhones
            }).eq('phone_number', senderPhone);

            const successMsg = `✅ Welcome to Afya Links, ${analysis.clinicDetails.clinicName}! Your account is fully set up.\n\nYou can now place orders by simply texting your list of medicines here.`;
            await WhatsAppManager.getInstance().sendMessage(sessionId, jid, successMsg);

            await saveChatLog(senderPhone, sessionId, 'model', successMsg);

        } else if (analysis.intent === 'PRICE_ASSIGNMENT' && analysis.amount && isFromPharmacy) {
            if (!analysis.orderNumber) {
                await WhatsAppManager.getInstance().sendMessage(sessionId, jid, "I couldn't identify the order number. Please reply directly to the order message with the total price.");
                return;
            }

            const order = await orderService.getOrderByNumber(analysis.orderNumber);
            if (!order) {
                await WhatsAppManager.getInstance().sendMessage(sessionId, jid, `Could not find order ${analysis.orderNumber}.`);
                return;
            }

            await orderService.updateOrderAmount(order.id, analysis.amount);
            const paymentLink = await paymentService.getPaymentRedirectUrl(order.order_number);

            const clinicPhone = order.customer_phone;
            const msgToClinic = `Your order ${order.order_number} has been reviewed by the pharmacy.\n\nTotal Amount: UGX ${analysis.amount.toLocaleString()}\n\nPlease complete your payment securely here:\n${paymentLink}`;
            
            await WhatsAppManager.getInstance().sendMessage(sessionId, `${clinicPhone}@s.whatsapp.net`, msgToClinic);
            await WhatsAppManager.getInstance().sendMessage(sessionId, jid, `✅ Price of UGX ${analysis.amount.toLocaleString()} set for ${order.order_number}. Payment link has been sent to the clinic.`);
            
        } else if (analysis.intent === 'NEW_ORDER' && !isFromPharmacy) {
            // Ignore if onboarding isn't done
            if (isOnboarding) {
                await WhatsAppManager.getInstance().sendMessage(sessionId, jid, "Please finish setting up your clinic account first before placing an order!");
                return;
            }

            const order = await orderService.createOrder({
                pharmacyId,
                clinicPhone: senderPhone,
                whatsappAccountId: sessionId,
                originalMessage: messageText
            });
            
            const notifyMsg = `🛒 *NEW AFYA LINKS ORDER*\nOrder: ${order.order_number}\nClinic: ${clinicData?.name || senderPhone}\n\nDetails:\n${messageText}\n\n*Please review the order and reply with the total price (e.g. "TOTAL 50000").*\n(Make sure to reply directly to this message so I know which order it is!)`;
            
            await WhatsAppManager.getInstance().sendMessage(sessionId, jid, notifyMsg);
        } else {
            logger.info("Message was categorized as UNKNOWN or ignored.");
        }

    } catch (error) {
        logger.error(error, `Error in Gemini handleIncomingMessage for session ${sessionId}:`);
    }
};
