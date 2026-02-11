import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getOffices, saveOffices, getLocations } from '../services/offices-service';
import type { Office } from '../services/offices-service';

const router = Router();

// GET /locations — список локаций
router.get('/locations', (_req: Request, res: Response) => {
  res.json(getLocations());
});

// GET / — все офисы
router.get('/', (_req: Request, res: Response) => {
  try {
    res.json(getOffices());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST / — создать офис
router.post('/', (req: Request, res: Response) => {
  try {
    const offices = getOffices();
    const newOffice: Office = {
      id: uuidv4().slice(0, 8),
      locationId: req.body.locationId || 'sokol',
      number: req.body.number || '',
      capacity: req.body.capacity || 1,
      area: req.body.area || 0,
      pricePerMonth: req.body.pricePerMonth || 0,
      link: req.body.link || '',
      availableFrom: req.body.availableFrom || 'available',
      status: req.body.status || 'free',
      notes: req.body.notes,
      lastUpdated: Date.now(),
    };
    offices.push(newOffice);
    saveOffices(offices);
    res.status(201).json(newOffice);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /:id — обновить офис
router.put('/:id', (req: Request, res: Response) => {
  try {
    const offices = getOffices();
    const idx = offices.findIndex(o => o.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Office not found' });
    }
    offices[idx] = {
      ...offices[idx],
      ...req.body,
      id: offices[idx].id,
      lastUpdated: Date.now(),
    };
    saveOffices(offices);
    res.json(offices[idx]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /:id — удалить офис
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const offices = getOffices();
    const idx = offices.findIndex(o => o.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Office not found' });
    }
    offices.splice(idx, 1);
    saveOffices(offices);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
