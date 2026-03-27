import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { readJsonFile, writeJsonFile } from '../services/knowledge-service';
import type { AdminDependencies } from '../index';

export interface Location {
  id: string;
  name: string;
  active: boolean;
}

const DEFAULT_LOCATIONS: Location[] = [
  { id: 'sokol', name: 'Сокол', active: true },
  { id: 'chistye-prudy', name: 'Чистые пруды', active: true },
  { id: 'tsvetnoy', name: 'Цветной бульвар', active: true },
];

function getLocationsPath(basePath: string): string {
  return path.join(basePath, 'locations.json');
}

function loadLocations(basePath: string): Location[] {
  const filePath = getLocationsPath(basePath);
  if (!fs.existsSync(filePath)) {
    // Seed default locations if file missing
    console.log('[Locations] locations.json not found, seeding defaults...');
    try {
      writeJsonFile(filePath, DEFAULT_LOCATIONS);
      console.log('[Locations] ✅ Seeded default locations:', DEFAULT_LOCATIONS.map(l => l.name).join(', '));
    } catch (e) {
      console.error('[Locations] ❌ Failed to seed defaults:', e);
      return DEFAULT_LOCATIONS;
    }
    return DEFAULT_LOCATIONS;
  }
  return readJsonFile(filePath) as Location[];
}

function saveLocations(basePath: string, locations: Location[]): void {
  writeJsonFile(getLocationsPath(basePath), locations);
}

function getMediaJsonPath(basePath: string): string {
  return path.join(basePath, 'media.json');
}

function transliterate(text: string): string {
  const map: Record<string, string> = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
    'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
  };
  return text
    .toLowerCase()
    .split('')
    .map(ch => map[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function createLocationsRouter(deps: AdminDependencies): Router {
  const router = Router();
  const bp = deps.knowledgeBasePath;

  // GET / — все локации
  router.get('/', (_req: Request, res: Response) => {
    try {
      res.json(loadLocations(bp));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // POST / — создать локацию
  router.post('/', (req: Request, res: Response) => {
    try {
      const { name } = req.body;
      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: 'Name is required' });
      }

      const locations = loadLocations(bp);
      const id = transliterate(name.trim());

      if (locations.some(l => l.id === id)) {
        return res.status(409).json({ error: 'Location with this name already exists' });
      }

      const newLocation: Location = { id, name: name.trim(), active: true };
      locations.push(newLocation);
      saveLocations(bp, locations);

      // Автоматически создать пустой объект в media.json
      const mediaPath = getMediaJsonPath(bp);
      if (fs.existsSync(mediaPath)) {
        try {
          const mediaConfig = JSON.parse(fs.readFileSync(mediaPath, 'utf-8'));
          if (!mediaConfig.objects) mediaConfig.objects = {};
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
            fs.writeFileSync(mediaPath, JSON.stringify(mediaConfig, null, 2) + '\n', 'utf-8');
          }
        } catch { /* media.json may not exist yet */ }
      }

      deps.knowledgeBase.reload();
      res.status(201).json(newLocation);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // PUT /:id — обновить название
  router.put('/:id', (req: Request, res: Response) => {
    try {
      const locations = loadLocations(bp);
      const idx = locations.findIndex(l => l.id === req.params.id);
      if (idx === -1) {
        return res.status(404).json({ error: 'Location not found' });
      }

      const { name } = req.body;
      if (name && typeof name === 'string' && name.trim()) {
        locations[idx].name = name.trim();

        // Обновить имя в media.json
        const mediaPath = getMediaJsonPath(bp);
        if (fs.existsSync(mediaPath)) {
          try {
            const mediaConfig = JSON.parse(fs.readFileSync(mediaPath, 'utf-8'));
            if (mediaConfig.objects?.[req.params.id]) {
              mediaConfig.objects[req.params.id].name = name.trim();
              fs.writeFileSync(mediaPath, JSON.stringify(mediaConfig, null, 2) + '\n', 'utf-8');
            }
          } catch { /* ignore */ }
        }
      }

      saveLocations(bp, locations);
      deps.knowledgeBase.reload();
      res.json(locations[idx]);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // PATCH /:id/toggle-active — архив/активация
  router.patch('/:id/toggle-active', (req: Request, res: Response) => {
    try {
      const locations = loadLocations(bp);
      const idx = locations.findIndex(l => l.id === req.params.id);
      if (idx === -1) {
        return res.status(404).json({ error: 'Location not found' });
      }

      locations[idx].active = !locations[idx].active;
      saveLocations(bp, locations);
      deps.knowledgeBase.reload();
      res.json(locations[idx]);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}
