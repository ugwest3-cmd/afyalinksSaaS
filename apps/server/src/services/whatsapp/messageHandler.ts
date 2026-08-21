import type { Message } from 'whatsapp-web.js';
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

            let systemPrompt = `You are the AI assistant for a wholesale pharmacy on Afya Links.
You receive messages from local clinics. Your job is to be extremely helpful, professional, and concise.

If the user wants to buy or order something, your intent MUST be 'NEW_ORDER'.
Do not ask for confirmation before placing an order. If they list items, just set intent to 'NEW_ORDER'.

If they are just saying hello, asking a general question, or chatting, set intent to 'CONVERSATIONAL_REPLY' and write a friendly response in 'replyText'.`;
            
            try {
                const { data: promptData } = await supabaseAdmin.from('system_settings').select('system_prompt').eq('id', 1).single();
                if (promptData?.system_prompt) systemPrompt = promptData.system_prompt;
            } catch (e) {}

            if (isOnboarding) {
                systemPrompt += `\n\nCRITICAL: The clinic sending this message is currently ONBOARDING. We don't have their full details yet.
You MUST collect the following information from them conversationally:
1. Clinic Name
2. Location (City/Neighborhood)
3. Preferred Delivery Driver Name
4. Preferred Delivery Driver Phone Number

Ask for these details one by one or all at once naturally. Set intent to 'CONVERSATIONAL_REPLY' to ask questions.
ONCE they have provided ALL FOUR details, set the intent to 'ONBOARDING_COMPLETE' and populate the 'clinicDetails' object.`;
            } else {
                systemPrompt += `\n\nThe clinic's account is fully set up. If they list medicines, set intent to 'NEW_ORDER'. Do NOT say you will place the order in 'replyText', just use 'NEW_ORDER' intent and the system will automatically notify them.`;
            }

            let historyContents: any[] = [];
            
            // Always load the last 15 messages so the AI has full context of the conversation
            try {
                const { data: logs } = await supabaseAdmin.from('chat_logs')
                    .select('role, content')
                    .eq('phone_number', senderPhone)
                    .order('created_at', { ascending: false })
                    .limit(15);
                    
                if (logs && logs.length > 0) {
                    historyContents = logs.reverse().map((l: any) => ({
                        role: l.role === 'model' ? 'model' : 'user',
                        parts: [{ text: l.content }]
                    }));
                }
            } catch (e) {
                logger.error(e, 'Failed to fetch chat logs');
            }

            // Fallback in case logs failed
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

            const rawResponse = response.text;
            if (!rawResponse) {
                throw new Error('Gemini returned an empty response');
            }
            let analysis: any;
            try {
                // Strip markdown formatting if Gemini included it
                const jsonStr = rawResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                analysis = JSON.parse(jsonStr);
            } catch (e) {
                logger.error(`Failed to parse Gemini response as JSON: ${rawResponse}`);
                await WhatsAppManager.getInstance().sendMessage(sessionId, jid, "Sorry, I didn't understand that. Could you rephrase your request?");
                return;
            }

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
