import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { supabaseAdmin } from '../config/supabase.js';
import { WhatsAppManager } from '../services/whatsapp/manager.js';

const router: Router = Router();
router.use(requireAuth);
router.use(requireRole(['SUPER_ADMIN']));

router.post('/send', async (req, res) => {
    try {
        const { audience, message } = req.body;
        if (!message) return res.status(400).json({ error: 'Message is required' });

        let recipients = [];
        if (audience === 'clinics') {
            const { data } = await supabaseAdmin.from('clinics').select('phone_number');
            recipients = data?.map(c => c.phone_number) || [];
        } else if (audience === 'pharmacies') {
            const { data } = await supabaseAdmin.from('pharmacies').select('whatsapp_number');
            recipients = data?.map(p => p.whatsapp_number) || [];
        } else {
            return res.status(400).json({ error: 'Invalid audience' });
        }

        if (recipients.length === 0) {
            return res.status(404).json({ error: 'No recipients found for this audience' });
        }

        const sessions = WhatsAppManager.getInstance().getAllSessions();
        const activeSession = sessions.find(s => s.status === 'CONNECTED');
        
        if (!activeSession) {
            return res.status(400).json({ error: 'No active WhatsApp session connected to send the broadcast' });
        }

        let successCount = 0;
        for (const phone of recipients) {
            if (phone) {
                try {
                    await WhatsAppManager.getInstance().sendMessage(activeSession.sessionId, `${phone}@s.whatsapp.net`, message);
                    successCount++;
                } catch (e) {
                    console.error(`Failed to send to ${phone}`, e);
                }
            }
        }

        res.json({ success: true, message: `Sent successfully to ${successCount} recipients` });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
