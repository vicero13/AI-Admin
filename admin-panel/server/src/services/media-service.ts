import fs from 'fs';
import path from 'path';
import { PATHS } from '../utils/paths';

export interface MediaItem {
  id: string;
  type: 'photo' | 'video';
  url?: string;
  filePath?: string;
  caption?: string;
  tags: string[];
}

export interface ObjectMedia {
  name: string;
  photos: MediaItem[];
  videos: MediaItem[];
  tour3d?: string;
  presentation?: string;
  cianLink?: string;
  keywords: string[];
}

export interface OfficeMedia {
  name: string;
  address: string;
  photos: MediaItem[];
  videos: MediaItem[];
  keywords: string[];
}

export interface MediaConfig {
  enabled: boolean;
  basePath: string;
  objects: Record<string, ObjectMedia>;
  offices: Record<string, OfficeMedia>;
}

const DEFAULT_CONFIG: MediaConfig = {
  enabled: true,
  basePath: './media',
  objects: {},
  offices: {},
};

function ensureBackupDir() {
  if (!fs.existsSync(PATHS.backups)) {
    fs.mkdirSync(PATHS.backups, { recursive: true });
  }
}

function createBackup() {
  ensureBackupDir();
  if (fs.existsSync(PATHS.mediaJson)) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(PATHS.backups, `media.json.${ts}.bak`);
    fs.copyFileSync(PATHS.mediaJson, backupFile);
  }
}

export function getMediaConfig(): MediaConfig {
  if (!fs.existsSync(PATHS.mediaJson)) return { ...DEFAULT_CONFIG };
  const raw = fs.readFileSync(PATHS.mediaJson, 'utf-8');
  return JSON.parse(raw);
}

export function saveMediaConfig(config: MediaConfig): void {
  createBackup();
  fs.writeFileSync(PATHS.mediaJson, JSON.stringify(config, null, 2) + '\n', 'utf-8');
  // Hot-reload: уведомить бот о новом конфиге
  notifyBotReload();
}

function notifyBotReload(): void {
  const botPort = process.env.BOT_PORT || '3000';
  const url = `http://localhost:${botPort}/api/admin/reload-media`;
  fetch(url, { method: 'POST' }).catch(() => {
    // Бот может быть не запущен — игнорируем ошибку
  });
}

export function updateObjectMedia(locationId: string, data: ObjectMedia): MediaConfig {
  const config = getMediaConfig();
  config.objects[locationId] = data;
  saveMediaConfig(config);
  return config;
}

export function updateOfficeMedia(officeId: string, data: OfficeMedia): MediaConfig {
  const config = getMediaConfig();
  config.offices[officeId] = data;
  saveMediaConfig(config);
  return config;
}

export function deleteOfficeMedia(officeId: string): MediaConfig {
  const config = getMediaConfig();
  delete config.offices[officeId];
  saveMediaConfig(config);
  return config;
}

export function setMediaEnabled(enabled: boolean): MediaConfig {
  const config = getMediaConfig();
  config.enabled = enabled;
  saveMediaConfig(config);
  return config;
}
