import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { supabaseAdmin } from '../config/supabase.js';

const router: Router = Router();

router.use(requireAuth);
router.use(requireRole(['SUPER_ADMIN']));

const DEFAULT_PROMPT = `You are an AI assistant for Afya Links, a wholesale pharmacy ordering platform.
Your job is to analyze a WhatsApp message and determine if it is a NEW_ORDER from a clinic, or a PRICE_ASSIGNMENT from the pharmacy.

Rules:
- If the message contains a list of medicines, it is a NEW_ORDER.
- If the message contains a total price (e.g., "TOTAL 850000", "50k", "the price is 15000"), it is a PRICE_ASSIGNMENT.
- Extract the order number (e.g. AFY-XXXX-XXXXXX) if it appears in the message or the quoted message context.
- Extract the price amount as a raw number if it's a PRICE_ASSIGNMENT.`;

router.get('/settings', async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('system_settings')
            .select('system_prompt')
            .eq('id', 1)
            .single();
            
        if (error && error.code !== 'PGRST116') {
            throw error;
        }

        res.json({ success: true, prompt: data?.system_prompt || DEFAULT_PROMPT });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.patch('/settings', async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

        const { error } = await supabaseAdmin
            .from('system_settings')
            .upsert({ id: 1, system_prompt: prompt })
            .select();

        if (error) throw error;
        res.json({ success: true, message: 'AI Prompt updated successfully' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
