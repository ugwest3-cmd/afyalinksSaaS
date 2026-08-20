import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import * as pharmacyService from '../services/pharmacy.service.js';

const router: Router = Router();

router.use(requireAuth);
router.use(requireRole('SUPER_ADMIN'));

router.post('/', async (req: Request, res: Response) => {
  try {
    const pharmacy = await pharmacyService.createPharmacy(req.body, req.user!.id);
    res.status(201).json(pharmacy);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const filters = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 10,
      status: req.query.status as string,
      search: req.query.search as string,
    };
    const result = await pharmacyService.getPharmacies(filters);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const pharmacy = await pharmacyService.getPharmacyById(req.params.id);
    if (!pharmacy) {
      res.status(404).json({ error: 'Pharmacy not found' });
      return;
    }
    res.json(pharmacy);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const pharmacy = await pharmacyService.updatePharmacy(req.params.id, req.body, req.user!.id);
    res.json(pharmacy);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await pharmacyService.deletePharmacy(req.params.id, req.user!.id);
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
