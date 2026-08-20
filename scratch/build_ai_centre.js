const fs = require('fs');
const path = require('path');

const aiRoutesContent = `import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { supabaseAdmin } from '../config/supabase.js';

const router: Router = Router();

router.use(requireAuth);
router.use(requireRole(['SUPER_ADMIN']));

const DEFAULT_PROMPT = \`You are an AI assistant for Afya Links, a wholesale pharmacy ordering platform.
Your job is to analyze a WhatsApp message and determine if it is a NEW_ORDER from a clinic, or a PRICE_ASSIGNMENT from the pharmacy.

Rules:
- If the message contains a list of medicines, it is a NEW_ORDER.
- If the message contains a total price (e.g., "TOTAL 850000", "50k", "the price is 15000"), it is a PRICE_ASSIGNMENT.
- Extract the order number (e.g. AFY-XXXX-XXXXXX) if it appears in the message or the quoted message context.
- Extract the price amount as a raw number if it's a PRICE_ASSIGNMENT.\`;

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
`;

fs.writeFileSync('g:\\AFYA LINKS\\apps\\server\\src\\routes\\ai.routes.ts', aiRoutesContent);

const campaignRoutesContent = `import { Router } from 'express';
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
                    await WhatsAppManager.getInstance().sendMessage(activeSession.sessionId, \`\${phone}@s.whatsapp.net\`, message);
                    successCount++;
                } catch (e) {
                    console.error(\`Failed to send to \${phone}\`, e);
                }
            }
        }

        res.json({ success: true, message: \`Sent successfully to \${successCount} recipients\` });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
`;

fs.writeFileSync('g:\\AFYA LINKS\\apps\\server\\src\\routes\\campaign.routes.ts', campaignRoutesContent);

const indexTsPath = 'g:\\AFYA LINKS\\apps\\server\\src\\index.ts';
let indexContent = fs.readFileSync(indexTsPath, 'utf8');

if (!indexContent.includes('ai.routes.js')) {
    indexContent = indexContent.replace(
        "import whatsappRoutes from './routes/whatsapp.routes.js';",
        "import whatsappRoutes from './routes/whatsapp.routes.js';\\nimport aiRoutes from './routes/ai.routes.js';\\nimport campaignRoutes from './routes/campaign.routes.js';"
    );
    indexContent = indexContent.replace(
        "app.use('/api/admin/whatsapp', whatsappRoutes);",
        "app.use('/api/admin/whatsapp', whatsappRoutes);\\napp.use('/api/admin/ai', aiRoutes);\\napp.use('/api/admin/campaigns', campaignRoutes);"
    );
    fs.writeFileSync(indexTsPath, indexContent);
}
