import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import { PATHS } from '../utils/paths';

function ensureBackupDir() {
  if (!fs.existsSync(PATHS.backups)) {
    fs.mkdirSync(PATHS.backups, { recursive: true });
  }
}

function createBackup(filePath: string) {
  ensureBackupDir();
  const name = path.basename(filePath);
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(PATHS.backups, `${name}.${ts}.bak`);
  fs.copyFileSync(filePath, backupPath);
}

export function readConfig(): Record<string, unknown> {
  const raw = fs.readFileSync(PATHS.config, 'utf-8');
  return YAML.parse(raw);
}

export function writeConfig(config: Record<string, unknown>): void {
  createBackup(PATHS.config);
  const yamlStr = YAML.stringify(config, { indent: 2, lineWidth: 120 });
  fs.writeFileSync(PATHS.config, yamlStr, 'utf-8');
}

export function updateConfigSection(section: string, data: unknown): Record<string, unknown> {
  const config = readConfig();
  (config as any)[section] = data;
  writeConfig(config);
  return config;
}
