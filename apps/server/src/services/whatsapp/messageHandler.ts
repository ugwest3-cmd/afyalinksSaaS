import { WAMessage } from '@whiskeysockets/baileys';
import { logger } from '../../config/logger.js';
import { supabaseAdmin } from '../../config/supabase.js';

// Placeholders for future services
const orderService = {
    createOrderFromMessage: async (clinicId: string, pharmacyId: string, messageText: string, rawMessage: any) => {
        logger.info(`[Order Service Placeholder] Creating order for Clinic ${clinicId}, Pharmacy ${pharmacyId}`);
        return { id: 'order_123', status: 'PENDING' };
    },
    saveRawMessage: async (orderId: string, messagePayload: any) => {
        logger.info(`[Order Service Placeholder] Saving raw message to order ${orderId}`);
    }
};

const pricingService = {
    processPharmacyPricingResponse: async (orderId: string, text: string) => {
        logger.info(`[Pricing Service Placeholder] Processing pricing for order ${orderId}`);
    }
};

export const handleIncomingMessage = async (sessionId: string, message: WAMessage) => {
    try {
        const jid = message.key.remoteJid;
        if (!jid || jid === 'status@broadcast') return;

        // Extract sender phone
        const senderPhone = jid.split('@')[0];
        const messageText = message.message?.conversation || 
                            message.message?.extendedTextMessage?.text || 
                            message.message?.imageMessage?.caption || 
                            '';

        logger.info(`Received message on session ${sessionId} from ${senderPhone}: ${messageText.substring(0, 50)}...`);

        // 1. Look up whatsapp_accounts to find pharmacy_id
        const { data: accountData, error: accountError } = await supabaseAdmin
            .from('whatsapp_accounts')
            .select('pharmacy_id')
            .eq('session_id', sessionId)
            .single();

        if (accountError || !accountData) {
            logger.warn(`Could not find pharmacy account for session ${sessionId}. Error: ${accountError?.message}`);
            return;
        }

        const pharmacyId = accountData.pharmacy_id;

        // 2. Determine message type
        const isPricingResponse = messageText.toUpperCase().includes('TOTAL'); // Simplistic check per spec placeholder

        if (isPricingResponse) {
            // Extract order ID from message context or state (simplified for MVP)
            // Example pattern: "TOTAL 15000"
            logger.info(`Message identified as pricing response.`);
            await pricingService.processPharmacyPricingResponse('placeholder_order_id', messageText);
        } else {
            // 3. Look up or create clinic
            let { data: clinicData } = await supabaseAdmin
                .from('clinics')
                .select('id')
                .eq('phone_number', senderPhone)
                .single();

            if (!clinicData) {
                logger.info(`Unknown clinic number ${senderPhone}. Creating new clinic placeholder.`);
                // For MVP, create a minimal clinic record or handle creation flow
                // This would be replaced by actual clinic onboarding
                const { data: newClinic, error: createError } = await supabaseAdmin
                    .from('clinics')
                    .insert({ 
                        phone_number: senderPhone,
                        name: `Clinic ${senderPhone}`
                    })
                    .select('id')
                    .single();
                
                if (createError) {
                    logger.error(createError, 'Failed to create clinic:');
                    return;
                }
                clinicData = newClinic;
            }

            const clinicId = clinicData.id;

            // 4. Create Order
            const order = await orderService.createOrderFromMessage(clinicId, pharmacyId, messageText, message);
            
            // 5. Save raw message
            await orderService.saveRawMessage(order.id, message);
        }

    } catch (error) {
        logger.error(error, `Error in handleIncomingMessage for session ${sessionId}:`);
    }
};
