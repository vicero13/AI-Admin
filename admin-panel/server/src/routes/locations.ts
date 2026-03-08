import { Router, Request, Response } from 'express';
import {
  getLocations,
  saveLocations,
  generateLocationId,
} from '../services/locations-service';
import { getMediaConfig, saveMediaConfig } from '../services/media-service';

const router = Router();

// GET / — все локации
router.get('/', (_req: Request, res: Response) => {
  try {
    res.json(getLocations());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST / — создать локацию
router.post('/', (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const locations = getLocations();
    const id = generateLocationId(name.trim());

    if (locations.some(l => l.id === id)) {
      return res.status(409).json({ error: 'Location with this name already exists' });
    }

    const newLocation = { id, name: name.trim(), active: true };
    locations.push(newLocation);
    saveLocations(locations);

    // Автоматически создать пустой объект в media.json
    const mediaConfig = getMediaConfig();
    if (!mediaConfig.objects[id]) {
      mediaConfig.objects[id] = {
        name: name.trim(),
        photos: [],
        videos: [],
        tour3d: '',
        presentation: '',
        cianLink: '',
        keywords: [name.trim().toLowerCase()],
      };
      saveMediaConfig(mediaConfig);
    }

    res.status(201).json(newLocation);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /:id — обновить название
router.put('/:id', (req: Request, res: Response) => {
  try {
    const locations = getLocations();
    const idx = locations.findIndex(l => l.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Location not found' });
    }

    const { name } = req.body;
    if (name && typeof name === 'string' && name.trim()) {
      locations[idx].name = name.trim();

      // Обновить имя в media.json тоже
      const mediaConfig = getMediaConfig();
      if (mediaConfig.objects[req.params.id]) {
        mediaConfig.objects[req.params.id].name = name.trim();
        saveMediaConfig(mediaConfig);
      }
    }

    saveLocations(locations);
    res.json(locations[idx]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /:id/toggle-active — архив/активация
router.patch('/:id/toggle-active', (req: Request, res: Response) => {
  try {
    const locations = getLocations();
    const idx = locations.findIndex(l => l.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Location not found' });
    }

    locations[idx].active = !locations[idx].active;
    saveLocations(locations);
    res.json(locations[idx]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
