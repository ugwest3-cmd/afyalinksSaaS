import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { WhatsAppManager } from '../services/whatsapp/manager.js';
import { supabaseAdmin } from '../config/supabase.js';

const router: Router = Router();
const whatsappManager = WhatsAppManager.getInstance();

// Apply auth and SUPER_ADMIN restriction to all routes
router.use(requireAuth);
router.use(requireRole(['SUPER_ADMIN']));

router.post('/connect', async (req: Request, res: Response) => {
    try {
        const { pharmacyId, phoneNumber } = req.body;

        if (!pharmacyId || !phoneNumber) {
            return res.status(400).json({ error: 'pharmacyId and phoneNumber are required' });
        }

        const sessionId = `wa_${uuidv4().replace(/-/g, '')}`;

        // Save to DB
        const { error } = await supabaseAdmin.from('whatsapp_accounts').upsert({
            session_id: sessionId,
            pharmacy_id: pharmacyId,
            phone_number: phoneNumber,
            status: 'PENDING',
            updated_at: new Date().toISOString()
        }, { onConflict: 'phone_number' });

        if (error) {
            throw error;
        }

        await whatsappManager.createSession(sessionId, pharmacyId, phoneNumber, true);

        res.status(201).json({ sessionId, message: 'Session created and connecting' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/sessions', (req: Request, res: Response) => {
    try {
        const sessions = whatsappManager.getAllSessions();
        res.status(200).json({ sessions });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/:sessionId/status', (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;
        const status = whatsappManager.getSessionStatus(sessionId);
        res.status(200).json({ sessionId, status });
    } catch (error: any) {
        res.status(404).json({ error: error.message });
    }
});

router.get('/:sessionId/qr', (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;
        const status = whatsappManager.getSessionStatus(sessionId);
        
        if (status === 'CONNECTED') {
            return res.status(200).json({ sessionId, status: 'CONNECTED', message: 'Session is already connected' });
        }

        const qrCode = whatsappManager.getQR(sessionId);
        if (!qrCode) {
            return res.status(404).json({ error: 'QR Code not available yet. Try again in a few seconds.' });
        }

        res.status(200).json({ sessionId, qrCode });
    } catch (error: any) {
        res.status(404).json({ error: error.message });
    }
});

router.post('/:sessionId/reconnect', async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;
        await whatsappManager.reconnectSession(sessionId);
        res.status(200).json({ message: 'Reconnection initiated' });
    } catch (error: any) {
        res.status(404).json({ error: error.message });
    }
});

router.post('/:sessionId/disconnect', async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;
        await whatsappManager.disconnectSession(sessionId);
        res.status(200).json({ message: 'Session disconnected' });
    } catch (error: any) {
        res.status(404).json({ error: error.message });
    }
});

router.post('/:sessionId/test-message', async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;
        const { to, message } = req.body;

        if (!to || !message) {
            return res.status(400).json({ error: 'to and message fields are required' });
        }

        await whatsappManager.sendMessage(sessionId, to, message);
        res.status(200).json({ message: 'Test message sent successfully' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
