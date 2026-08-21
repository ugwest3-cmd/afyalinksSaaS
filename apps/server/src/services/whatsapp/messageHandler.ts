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
        // Always add the current message to history if logs succeeded but didn't include it yet
        else if (historyContents[historyContents.length - 1].parts[0].text !== messageText) {
             historyContents.push({ role: 'user', parts: [{ text: messageText }] });
        }


        if (accountData.is_system) {
            // ==========================================
            // SYSTEM CONNECTION (Talking to Pharmacy Staff)
            // ==========================================
            
            await saveChatLog(senderPhone, sessionId, 'user', messageText);

            const systemPrompt = `You are the internal AI assistant for Afya Links, communicating with wholesale pharmacy staff.
Afya Links is a SaaS platform that connects clinics to wholesale pharmacies via WhatsApp.

HOW THE PLATFORM WORKS:
1. Clinics text their medicine orders to a dedicated WhatsApp number.
2. Afya Links captures the order and forwards it to the pharmacy staff (who you are talking to now).
3. The pharmacy staff reviews the order, checks their stock, and replies to YOU with the total price for the order.
4. Afya Links then generates a secure PesaPal payment link and sends it back to the clinic.
5. The clinic pays, and the pharmacy is notified to dispatch.

YOUR ROLE:
You read messages from the pharmacy staff. 
When the staff replies, they might just say "ORD-123 50000", or they might say "We don't have Panadol, but we have Paracetamol. Total for ORD-123 is 45000".

INTENTS:
- If the staff is setting a price for an order: intent MUST be 'PRICE_UPDATE'. Extract the order number into 'orderNumber', the final numerical amount into 'amount' (as a number), and ANY message they want passed to the clinic into 'messageForClinic' (e.g. "We replaced Panadol with Paracetamol").
- For anything else (questions, chat): intent MUST be 'CONVERSATIONAL_REPLY' and respond in 'replyText'. Be helpful.`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: historyContents,
                config: {
                    systemInstruction: systemPrompt,
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            intent: { type: Type.STRING, description: "Must be 'PRICE_UPDATE', 'CONVERSATIONAL_REPLY', or 'UNKNOWN'" },
                            replyText: { type: Type.STRING },
                            orderNumber: { type: Type.STRING },
                            amount: { type: Type.NUMBER },
                            messageForClinic: { type: Type.STRING, description: "Optional message to pass to the clinic about stock changes, alternatives, or notes." }
                        },
                        required: ["intent"]
                    }
                }
            });

            const rawResponse = response.text;
            if (!rawResponse) throw new Error('Gemini returned an empty response');
            
            let analysis: any;
            try {
                const jsonStr = rawResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                analysis = JSON.parse(jsonStr);
            } catch (e) {
                logger.error(`Failed to parse Gemini response: ${rawResponse}`);
                return;
            }

            logger.info(`[Pharmacy AI Analysis] ${JSON.stringify(analysis)}`);

            if (analysis.intent === 'CONVERSATIONAL_REPLY' && analysis.replyText) {
                await WhatsAppManager.getInstance().sendMessage(sessionId, jid, analysis.replyText);
                await saveChatLog(senderPhone, sessionId, 'model', analysis.replyText);
            } 
            else if (analysis.intent === 'PRICE_UPDATE' && analysis.orderNumber && analysis.amount) {
                const orderNumber = analysis.orderNumber.toUpperCase();
                const amount = analysis.amount;
                const order = await orderService.getOrderByNumber(orderNumber);
                
                if (!order) {
                    const errorMsg = `Could not find order ${orderNumber}. Please check the order ID and try again.`;
                    await WhatsAppManager.getInstance().sendMessage(sessionId, jid, errorMsg);
                    await saveChatLog(senderPhone, sessionId, 'model', errorMsg);
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
                    let msgToClinic = `Your order ${order.order_number} has been reviewed by the pharmacy.\n`;
                    if (analysis.messageForClinic) {
                        msgToClinic += `\n*Pharmacy Note:* ${analysis.messageForClinic}\n`;
                    }
                    msgToClinic += `\n*Total Amount:* UGX ${amount.toLocaleString()}\n\nPlease complete your payment securely here:\n${paymentLink}`;
                    
                    // Send to Clinic via Bot
                    await WhatsAppManager.getInstance().sendMessage(botAccount.session_id, `${clinicPhone}@s.whatsapp.net`, msgToClinic);
                }

                // Reply to Staff
                const successMsg = `✅ Price of UGX ${amount.toLocaleString()} set for ${order.order_number}. Payment link has been sent to the clinic.`;
                await WhatsAppManager.getInstance().sendMessage(sessionId, jid, successMsg);
                await saveChatLog(senderPhone, sessionId, 'model', successMsg);
            } else {
                const fallbackMsg = "To price an order, please reply with the Order ID and the amount (e.g. 'ORD-123 50000').";
                await WhatsAppManager.getInstance().sendMessage(sessionId, jid, fallbackMsg);
                await saveChatLog(senderPhone, sessionId, 'model', fallbackMsg);
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
                const { data: newClinic, error: insertError } = await supabaseAdmin
                    .from('clinics')
                    .insert({ phone_number: senderPhone, name: `Clinic ${senderPhone}`, status: 'PENDING' })
                    .select('*')
                    .single();
                    
                if (insertError) {
                    logger.error(insertError, `Failed to create clinic for ${senderPhone}`);
                }
                clinicData = newClinic || { phone_number: senderPhone };
            }

            isOnboarding = !clinicData?.preferred_driver_name;
            await saveChatLog(senderPhone, sessionId, 'user', messageText);

            let systemPrompt = `You are the AI assistant for a wholesale pharmacy operating on the Afya Links platform.
Afya Links connects local clinics directly to wholesale pharmacies via WhatsApp.

HOW THE PLATFORM WORKS:
1. Clinics (who you are talking to) text their medicine orders to this WhatsApp number.
2. We capture the order and send it to the wholesale pharmacy staff.
3. The pharmacy staff reviews the order and sets the final price.
4. We generate a secure PesaPal payment link and send it back to the clinic.
5. The clinic pays via the link, and the pharmacy dispatches the order.

YOUR ROLE:
You represent the pharmacy. You must be extremely helpful, professional, and concise.
You do NOT have a drug catalogue or prices. If a clinic asks for prices, explain that they should submit their list of medicines as an order, and the pharmacy staff will review it and reply with the final total price.

INTENTS:
- If the clinic wants to buy medicines, lists items, or places an order: your intent MUST be 'NEW_ORDER'. DO NOT ask for confirmation.
- If the clinic asks about the status of a past order (e.g. "Has my order shipped?"): your intent MUST be 'CHECK_ORDER_STATUS' and extract the order number into 'orderNumber'.
- For all other questions, greetings, or casual chat: set intent to 'CONVERSATIONAL_REPLY' and write a friendly response in 'replyText'.`;
            
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

            const response = await ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: historyContents,
                config: {
                    systemInstruction: systemPrompt,
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            intent: { type: Type.STRING, description: "Must be 'NEW_ORDER', 'CHECK_ORDER_STATUS', 'CONVERSATIONAL_REPLY', 'ONBOARDING_COMPLETE', or 'UNKNOWN'" },
                            replyText: { type: Type.STRING },
                            orderNumber: { type: Type.STRING },
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
                const jsonStr = rawResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                analysis = JSON.parse(jsonStr);
            } catch (e) {
                logger.error(`Failed to parse Gemini response as JSON: ${rawResponse}`);
                await WhatsAppManager.getInstance().sendMessage(sessionId, jid, "Sorry, I didn't understand that. Could you rephrase your request?");
                return;
            }

            logger.info(`[Clinic AI Analysis] ${JSON.stringify(analysis)}`);

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

            } else if (analysis.intent === 'CHECK_ORDER_STATUS' && analysis.orderNumber) {
                const orderNumber = analysis.orderNumber.toUpperCase();
                const order = await orderService.getOrderByNumber(orderNumber);
                
                let statusMsg = "";
                if (!order || order.customer_phone !== senderPhone) {
                    statusMsg = `I couldn't find an order with the ID ${orderNumber} associated with this phone number.`;
                } else {
                    statusMsg = `Order ${order.order_number} Status: *${order.status}*\n`;
                    if (order.status === 'AWAITING_PRICE' || order.status === 'SENT_TO_PHARMACY') {
                        statusMsg += "The pharmacy is currently reviewing your order and calculating the total price.";
                    } else if (order.status === 'PRICE_RECEIVED' || order.status === 'PAYMENT_PENDING') {
                        statusMsg += `The pharmacy has priced your order at UGX ${order.amount?.toLocaleString()}.\nPlease complete your payment here:\n${order.payment_link || 'Payment link unavailable'}`;
                    } else if (order.status === 'PAID') {
                        statusMsg += "Your payment has been received and the pharmacy is preparing to dispatch your order.";
                    }
                }
                
                await WhatsAppManager.getInstance().sendMessage(sessionId, jid, statusMsg);
                await saveChatLog(senderPhone, sessionId, 'model', statusMsg);

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

    } catch (error: any) {
        logger.error(error, `Error in handleIncomingMessage for session ${sessionId}:`);
        
        const jid = message.from;
        if (jid && !message.fromMe) {
            try {
                const senderPhone = jid.split('@')[0];
                const errMsg = "I'm sorry, my AI systems are temporarily unavailable. Please try again in a few minutes or contact support directly.";
                await WhatsAppManager.getInstance().sendMessage(sessionId, jid, errMsg);
                
                // Save to chat_logs for debugging
                await saveChatLog(senderPhone, sessionId, 'model', `[SYSTEM ERROR CRASH]: ${error.message}`);
            } catch (e) {
                // Ignore send errors in error handler
            }
        }
    }
};
