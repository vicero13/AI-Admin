import fs from 'fs';
import path from 'path';
import YAML from 'yaml';

function ensureBackupDir(configPath: string) {
  const backupDir = path.join(path.dirname(configPath), '.backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  return backupDir;
}

function createBackup(configPath: string) {
  const backupDir = ensureBackupDir(configPath);
  const name = path.basename(configPath);
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `${name}.${ts}.bak`);
  if (fs.existsSync(configPath)) {
    fs.copyFileSync(configPath, backupPath);
  }
}

export function readConfig(configPath: string): Record<string, unknown> {
  const raw = fs.readFileSync(configPath, 'utf-8');
  return YAML.parse(raw);
}

export function writeConfig(configPath: string, config: Record<string, unknown>): void {
  createBackup(configPath);
  const yamlStr = YAML.stringify(config, { indent: 2, lineWidth: 120 });
  fs.writeFileSync(configPath, yamlStr, 'utf-8');
}

export function readSection(configPath: string, section: string): unknown {
  const config = readConfig(configPath);
  return (config as any)[section];
}

export function writeSection(configPath: string, section: string, data: unknown): Record<string, unknown> {
  const config = readConfig(configPath);
  (config as any)[section] = data;
  writeConfig(configPath, config);
  return config;
}
