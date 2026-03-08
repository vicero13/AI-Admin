import fs from 'fs';
import path from 'path';
import { PATHS } from '../utils/paths';

export interface Location {
  id: string;
  name: string;
  active: boolean;
}

const locationsPath = path.join(PATHS.knowledgeBase, 'locations.json');

function ensureBackupDir() {
  if (!fs.existsSync(PATHS.backups)) {
    fs.mkdirSync(PATHS.backups, { recursive: true });
  }
}

function createBackup() {
  ensureBackupDir();
  if (fs.existsSync(locationsPath)) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(PATHS.backups, `locations.json.${ts}.bak`);
    fs.copyFileSync(locationsPath, backupFile);
  }
}

export function getLocations(): Location[] {
  if (!fs.existsSync(locationsPath)) return [];
  const raw = fs.readFileSync(locationsPath, 'utf-8');
  return JSON.parse(raw);
}

export function saveLocations(locations: Location[]): void {
  createBackup();
  fs.writeFileSync(locationsPath, JSON.stringify(locations, null, 2) + '\n', 'utf-8');
}

/** Транслитерация для генерации ID из названия */
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

export function generateLocationId(name: string): string {
  return transliterate(name);
}
