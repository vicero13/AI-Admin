import { Router, Request, Response } from 'express';
import * as configService from '../services/config-service';
import type { AdminDependencies } from '../index';

const VALID_SECTIONS = [
  'server', 'ai', 'personality', 'situationDetection', 'handoff',
  'telegram', 'redis', 'database', 'logging', 'admin', 'knowledgeBasePath', 'resources',
];

export function createSettingsRouter(deps: AdminDependencies): Router {
  const router = Router();
  const cp = deps.configPath;

  // Get entire config
  router.get('/', (_req: Request, res: Response) => {
    try {
      const config = configService.readConfig(cp);
      res.json(config);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Get specific section
  router.get('/:section', (req: Request, res: Response) => {
    try {
      const { section } = req.params;
      const data = configService.readSection(cp, section);
      if (data === undefined) {
        return res.status(404).json({ error: `Section "${section}" not found` });
      }
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Update specific section
  router.put('/:section', (req: Request, res: Response) => {
    try {
      const { section } = req.params;
      if (!VALID_SECTIONS.includes(section)) {
        return res.status(400).json({ error: `Invalid section: ${section}` });
      }
      configService.writeSection(cp, section, req.body);
      res.json({
        success: true,
        requiresRestart: true,
        message: 'Changes saved. Some changes may require server restart to take effect.',
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Update entire config
  router.put('/', (req: Request, res: Response) => {
    try {
      configService.writeConfig(cp, req.body);
      res.json({
        success: true,
        requiresRestart: true,
        message: 'Full config saved. Restart required.',
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}
