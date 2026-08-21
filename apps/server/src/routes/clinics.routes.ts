import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../config/logger.js';

const router: Router = Router();

// Get all clinics
router.get('/', async (req: Request, res: Response) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('clinics')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        logger.error(error, 'Error fetching clinics');
        res.status(500).json({ error: 'Failed to fetch clinics' });
    }
});

// Create new clinic
router.post('/', async (req: Request, res: Response) => {
    try {
        const { name, phone_number, location, preferred_driver_name, preferred_driver_phone, additional_phones } = req.body;
        
        const { data, error } = await supabaseAdmin
            .from('clinics')
            .insert({
                name,
                phone_number,
                location,
                preferred_driver_name,
                preferred_driver_phone,
                additional_phones
            })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error: any) {
        logger.error(error, 'Error creating clinic');
        res.status(500).json({ error: error.message });
    }
});

// Update clinic
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, phone_number, location, preferred_driver_name, preferred_driver_phone, additional_phones } = req.body;
        
        const { data, error } = await supabaseAdmin
            .from('clinics')
            .update({
                name,
                phone_number,
                location,
                preferred_driver_name,
                preferred_driver_phone,
                additional_phones
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        logger.error(error, 'Error updating clinic');
        res.status(500).json({ error: error.message });
    }
});

// Delete clinic
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { error } = await supabaseAdmin
            .from('clinics')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.status(204).send();
    } catch (error: any) {
        logger.error(error, 'Error deleting clinic');
        res.status(500).json({ error: error.message });
    }
});

export default router;
