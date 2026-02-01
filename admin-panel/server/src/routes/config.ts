import { Router, Request, Response } from 'express';
import { readConfig, writeConfig, updateConfigSection } from '../services/config-service';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  try {
    const config = readConfig();
    res.json(config);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/', (req: Request, res: Response) => {
  try {
    writeConfig(req.body);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:section', (req: Request, res: Response) => {
  try {
    const config = updateConfigSection(req.params.section, req.body);
    res.json(config);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
