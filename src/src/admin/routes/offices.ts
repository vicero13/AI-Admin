import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { readJsonFile, writeJsonFile } from '../services/knowledge-service';
import type { AdminDependencies } from '../index';

// Локации коворкингов
export const LOCATIONS = [
  { id: 'sokol', name: 'Сокол' },
  { id: 'chistye-prudy', name: 'Чистые пруды' },
  { id: 'tsvetnoy', name: 'Цветной бульвар' },
] as const;

export type LocationId = typeof LOCATIONS[number]['id'];

export interface Office {
  id: string;
  locationId: LocationId;       // Объект (локация)
  number: string;               // Номер офиса
  capacity: number;             // Кол-во рабочих мест
  area: number;                 // Квадратура (м²)
  pricePerMonth: number;        // Цена (₽/мес)
  link?: string;                // Ссылка (ЦИАН и т.д.)
  availableFrom: string;        // Дата освобождения (ISO date или 'available')
  status: 'free' | 'rented' | 'maintenance';
  notes?: string;
  lastUpdated: number;
}

function getOfficesPath(basePath: string): string {
  return path.join(basePath, 'offices.json');
}

function loadOffices(basePath: string): Office[] {
  const filePath = getOfficesPath(basePath);
  if (!fs.existsSync(filePath)) return [];
  return readJsonFile(filePath) as Office[];
}

function saveOffices(basePath: string, offices: Office[]): void {
  writeJsonFile(getOfficesPath(basePath), offices);
}

export function createOfficesRouter(deps: AdminDependencies): Router {
  const router = Router();
  const bp = deps.knowledgeBasePath;

  // Get locations list
  router.get('/locations', (_req: Request, res: Response) => {
    res.json(LOCATIONS);
  });

  // Get all offices
  router.get('/', (_req: Request, res: Response) => {
    try {
      const offices = loadOffices(bp);
      res.json(offices);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Get available offices only
  router.get('/available', (_req: Request, res: Response) => {
    try {
      const offices = loadOffices(bp);
      res.json(offices.filter(o => o.status === 'free'));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Create office
  router.post('/', (req: Request, res: Response) => {
    try {
      const offices = loadOffices(bp);
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
      saveOffices(bp, offices);
      deps.knowledgeBase.reload();
      res.status(201).json(newOffice);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Update office
  router.put('/:id', (req: Request, res: Response) => {
    try {
      const offices = loadOffices(bp);
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
      saveOffices(bp, offices);
      deps.knowledgeBase.reload();
      res.json(offices[idx]);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Delete office
  router.delete('/:id', (req: Request, res: Response) => {
    try {
      const offices = loadOffices(bp);
      const idx = offices.findIndex(o => o.id === req.params.id);
      if (idx === -1) {
        return res.status(404).json({ error: 'Office not found' });
      }
      offices.splice(idx, 1);
      saveOffices(bp, offices);
      deps.knowledgeBase.reload();
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}
