import fs from 'fs';
import path from 'path';
import { PATHS } from '../utils/paths';

// Локации коворкингов
export const LOCATIONS = [
  { id: 'sokol', name: 'Сокол' },
  { id: 'chistye-prudy', name: 'Чистые пруды' },
  { id: 'tsvetnoy', name: 'Цветной бульвар' },
] as const;

export interface Office {
  id: string;
  locationId: string;
  number: string;
  capacity: number;
  area: number;
  pricePerMonth: number;
  link?: string;
  availableFrom: string;
  status: 'free' | 'rented' | 'maintenance';
  notes?: string;
  lastUpdated: number;
}

const officesPath = path.join(PATHS.knowledgeBase, 'offices.json');

function ensureBackupDir() {
  if (!fs.existsSync(PATHS.backups)) {
    fs.mkdirSync(PATHS.backups, { recursive: true });
  }
}

function createBackup() {
  ensureBackupDir();
  if (fs.existsSync(officesPath)) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(PATHS.backups, `offices.json.${ts}.bak`);
    fs.copyFileSync(officesPath, backupFile);
  }
}

export function getOffices(): Office[] {
  if (!fs.existsSync(officesPath)) return [];
  const raw = fs.readFileSync(officesPath, 'utf-8');
  return JSON.parse(raw);
}

export function saveOffices(offices: Office[]): void {
  createBackup();
  fs.writeFileSync(officesPath, JSON.stringify(offices, null, 2) + '\n', 'utf-8');
}

export function getLocations() {
  return [...LOCATIONS];
}
