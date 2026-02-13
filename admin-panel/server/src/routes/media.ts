import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { PATHS } from '../utils/paths';
import {
  getMediaConfig,
  updateObjectMedia,
  updateOfficeMedia,
  deleteOfficeMedia,
  setMediaEnabled,
} from '../services/media-service';

const router = Router();

// Multer disk storage for file uploads (presentations, photos, videos)
const presMimes = ['application/pdf', 'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation'];
const videoMimes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/x-matroska'];

const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    let dir = PATHS.mediaPhotos;
    if (presMimes.includes(file.mimetype)) dir = PATHS.mediaPresentations;
    else if (videoMimes.includes(file.mimetype)) dir = PATHS.mediaVideos;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const id = uuidv4().slice(0, 8);
    cb(null, `${id}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      ...presMimes,
      'image/jpeg',
      'image/png',
      'image/webp',
      ...videoMimes,
    ];
    cb(null, allowed.includes(file.mimetype));
  },
});

// GET / — весь медиа-конфиг
router.get('/', (_req: Request, res: Response) => {
  try {
    res.json(getMediaConfig());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /enabled — вкл/выкл медиа
router.patch('/enabled', (req: Request, res: Response) => {
  try {
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled must be boolean' });
    }
    const config = setMediaEnabled(enabled);
    res.json(config);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /objects/:locationId — обновить медиа объекта
router.put('/objects/:locationId', (req: Request, res: Response) => {
  try {
    const { locationId } = req.params;
    const data = req.body;
    if (!data.name || !Array.isArray(data.photos) || !Array.isArray(data.videos) || !Array.isArray(data.keywords)) {
      return res.status(400).json({ error: 'Invalid object media data' });
    }
    const config = updateObjectMedia(locationId, data);
    res.json(config);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /offices/:officeId — обновить/создать медиа офиса
router.put('/offices/:officeId', (req: Request, res: Response) => {
  try {
    const { officeId } = req.params;
    const data = req.body;
    if (!data.name || !Array.isArray(data.photos) || !Array.isArray(data.videos) || !Array.isArray(data.keywords)) {
      return res.status(400).json({ error: 'Invalid office media data' });
    }
    const config = updateOfficeMedia(officeId, data);
    res.json(config);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /offices/:officeId — удалить медиа офиса
router.delete('/offices/:officeId', (req: Request, res: Response) => {
  try {
    const { officeId } = req.params;
    const config = deleteOfficeMedia(officeId);
    res.json(config);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /upload — загрузка файла (фото или презентация)
router.post('/upload', upload.single('file'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const relativePath = path.relative(PATHS.root, req.file.path);
    res.json({
      filePath: relativePath,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
