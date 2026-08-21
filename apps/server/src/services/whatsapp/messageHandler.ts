import { Message } from 'whatsapp-web.js';
import { logger } from '../../config/logger.js';
import { supabaseAdmin } from '../../config/supabase.js';
import { GoogleGenAI, Type } from '@google/genai';
import { orderService } from '../order.service.js';
import { paymentService } from '../pesapal/payment.service.js';
import { WhatsAppManager } from './manager.js';

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function saveChatLog(phoneNumber: string, sessionId: string, role: string, content: string) {
    const { error } = await supabaseAdmin.from('chat_logs').insert({
        phone_number: phoneNumber,
        session_id: sessionId,
        role,
        content
    });
    if (error) logger.error(error, 'Failed to save chat log');
}

export const handleIncomingMessage = async (sessionId: string, message: Message) => {
    try {
        const jid = message.from;
        if (!jid || jid === 'status@broadcast') return;

        const senderPhone = jid.split('@')[0];
        const isFromMe = message.fromMe === true;

        if (isFromMe) return; // Ignore messages we sent ourselves

        const messageText = message.body || '';

        if (!messageText) return;

        logger.info(`Incoming on ${sessionId} from ${senderPhone}: ${messageText.substring(0, 50)}`);

        // 1. Determine which connection this is
        const { data: accountData } = await supabaseAdmin
            .from('whatsapp_accounts')
            .select('pharmacy_id, is_system')
            .eq('session_id', sessionId)
            .single();

        if (!accountData) return;

        if (accountData.is_system) {
            // ==========================================
            // SYSTEM CONNECTION (Talking to Pharmacy Staff)
            // ==========================================
            // Look for ORD-XYZ and an amount
            const orderMatch = messageText.match(/(ORD-[A-Za-z0-9]+)/i);
            const amountMatch = messageText.match(/(\d{4,})/); // Any number >= 1000

            if (orderMatch && amountMatch) {
                const orderNumber = orderMatch[1].toUpperCase();
                const amount = parseInt(amountMatch[1], 10);

                const order = await orderService.getOrderByNumber(orderNumber);
                if (!order) {
                    await WhatsAppManager.getInstance().sendMessage(sessionId, jid, `Could not find order ${orderNumber}.`);
                    return;
                }

                // Update Price
                await orderService.updateOrderAmount(order.id, amount);
                const paymentLink = await paymentService.getPaymentRedirectUrl(order.order_number);

                // Find Clinic-Facing Bot Session
                const { data: botAccount } = await supabaseAdmin
                    .from('whatsapp_accounts')
                    .select('session_id')
                    .eq('pharmacy_id', order.pharmacy_id)
                    .eq('is_system', false)
                    .single();

                if (botAccount) {
                    const clinicPhone = order.customer_phone;
                    const msgToClinic = `Your order ${order.order_number} has been reviewed by the pharmacy.\n\nTotal Amount: UGX ${amount.toLocaleString()}\n\nPlease complete your payment securely here:\n${paymentLink}`;
                    
                    // Send to Clinic via Bot
                    await WhatsAppManager.getInstance().sendMessage(botAccount.session_id, `${clinicPhone}@s.whatsapp.net`, msgToClinic);
                }

                // Reply to Staff
                await WhatsAppManager.getInstance().sendMessage(sessionId, jid, `✅ Price of UGX ${amount.toLocaleString()} set for ${order.order_number}. Payment link has been sent to the clinic.`);
            } else {
                await WhatsAppManager.getInstance().sendMessage(sessionId, jid, "To price an order, please reply with the Order ID and the amount (e.g. 'ORD-123 50000').");
            }

        } else {
            // ==========================================
            // BOT CONNECTION (Talking to Clinic)
            // ==========================================
            const pharmacyId = accountData.pharmacy_id;

            let clinicData: any = null;
            let isOnboarding = false;

            const { data } = await supabaseAdmin.from('clinics').select('*').eq('phone_number', senderPhone).single();
            clinicData = data;

            if (!clinicData) {
                const { data: newClinic } = await supabaseAdmin
                    .from('clinics')
                    .insert({ phone_number: senderPhone, name: `Clinic ${senderPhone}`, status: 'PENDING' })
                    .select('*')
                    .single();
                clinicData = newClinic;
            }

            isOnboarding = !clinicData?.preferred_driver_name;
            await saveChatLog(senderPhone, sessionId, 'user', messageText);

            let systemPrompt = `You are an AI assistant for a wholesale pharmacy. You are taking orders from clinics.`;
            
            try {
                const { data: promptData } = await supabaseAdmin.from('system_settings').select('system_prompt').eq('id', 1).single();
                if (promptData?.system_prompt) systemPrompt = promptData.system_prompt;
            } catch (e) {}

            let historyContents: any[] = [];
            
            if (isOnboarding) {
                systemPrompt += `\nThe clinic sending this message is currently ONBOARDING. Collect their Clinic Name, Location, and Driver Details (Name/Phone). Use CONVERSATIONAL_REPLY intent to ask questions. Once everything is collected, use ONBOARDING_COMPLETE intent and fill clinicDetails.`;
                try {
                    const { data: logs } = await supabaseAdmin.from('chat_logs').select('role, content').eq('phone_number', senderPhone).order('created_at', { ascending: false }).limit(10);
                    if (logs) {
                        historyContents = logs.reverse().map((l: any) => ({
                            role: l.role === 'model' ? 'model' : 'user',
                            parts: [{ text: l.content }]
                        }));
                    }
                } catch (e) {}
            }

            if (historyContents.length === 0) {
                historyContents = [{ role: 'user', parts: [{ text: messageText }] }];
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
                            intent: { type: Type.STRING, description: "Must be 'NEW_ORDER', 'CONVERSATIONAL_REPLY', 'ONBOARDING_COMPLETE', or 'UNKNOWN'" },
                            replyText: { type: Type.STRING },
                            clinicDetails: {
                                type: Type.OBJECT,
                                properties: {
                                    clinicName: { type: Type.STRING },
                                    location: { type: Type.STRING },
                                    driverName: { type: Type.STRING },
                                    driverPhone: { type: Type.STRING },
                                    additionalPhones: { type: Type.ARRAY, items: { type: Type.STRING } }
                                }
                            }
                        },
                        required: ["intent"]
                    }
                }
            });

            const resultText = response.text;
            if (!resultText) return;
            
            const analysis = JSON.parse(resultText);
            logger.info(`[Gemini Analysis] ${JSON.stringify(analysis)}`);

            if (analysis.intent === 'CONVERSATIONAL_REPLY' && analysis.replyText) {
                await WhatsAppManager.getInstance().sendMessage(sessionId, jid, analysis.replyText);
                await saveChatLog(senderPhone, sessionId, 'model', analysis.replyText);
                
            } else if (analysis.intent === 'ONBOARDING_COMPLETE' && analysis.clinicDetails) {
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

            } else if (analysis.intent === 'NEW_ORDER') {
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
                
                await WhatsAppManager.getInstance().sendMessage(sessionId, jid, `✅ Order received! Your Order ID is ${order.order_number}. I have forwarded this to the pharmacy for pricing. You will receive a payment link shortly.`);

                // Find System Session and Pharmacy Staff Phone
                const { data: systemAccount } = await supabaseAdmin.from('whatsapp_accounts').select('session_id').eq('is_system', true).single();
                const { data: pharmacyInfo } = await supabaseAdmin.from('pharmacies').select('staff_phone_number, name').eq('id', pharmacyId).single();

                if (systemAccount && pharmacyInfo?.staff_phone_number) {
                    // Format number (remove + or 0, prefix with country code)
                    let staffPhone = pharmacyInfo.staff_phone_number.replace(/\D/g, '');
                    if (staffPhone.startsWith('0')) staffPhone = '256' + staffPhone.substring(1); // Assuming Uganda

                    const notifyMsg = `🛒 *NEW AFYA LINKS ORDER*\nOrder: ${order.order_number}\nClinic: ${clinicData?.name || senderPhone}\n\nDetails:\n${messageText}\n\n*Please review the order and reply with the total price (e.g. "${order.order_number} 50000").*`;
                    
                    await WhatsAppManager.getInstance().sendMessage(systemAccount.session_id, `${staffPhone}@s.whatsapp.net`, notifyMsg);
                } else {
                    logger.error(`Could not forward order ${order.order_number}. System session: ${!!systemAccount}, Staff phone: ${!!pharmacyInfo?.staff_phone_number}`);
                }
            }
        }

    } catch (error) {
        logger.error(error, `Error in handleIncomingMessage for session ${sessionId}:`);
    }
};
