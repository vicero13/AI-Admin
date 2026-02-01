import fs from 'fs';
import path from 'path';

function ensureBackupDir(filePath: string) {
  const backupDir = path.join(path.dirname(filePath), '.backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  return backupDir;
}

function createBackup(filePath: string) {
  const backupDir = ensureBackupDir(filePath);
  const name = path.basename(filePath);
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `${name}.${ts}.bak`);
  if (fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, backupPath);
  }
}

export function readJsonFile(filePath: string): unknown {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

export function writeJsonFile(filePath: string, data: unknown): void {
  createBackup(filePath);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

export function listJsonFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
}

// ===================== Business Info =====================
export function getBusinessInfo(basePath: string) {
  return readJsonFile(path.join(basePath, 'business-info.json'));
}

export function saveBusinessInfo(basePath: string, data: unknown) {
  writeJsonFile(path.join(basePath, 'business-info.json'), data);
}

// ===================== Services =====================
export function getServices(basePath: string) {
  return readJsonFile(path.join(basePath, 'services.json'));
}

export function saveServices(basePath: string, data: unknown) {
  writeJsonFile(path.join(basePath, 'services.json'), data);
}

// ===================== Team =====================
export function getTeam(basePath: string) {
  return readJsonFile(path.join(basePath, 'team.json'));
}

export function saveTeam(basePath: string, data: unknown) {
  writeJsonFile(path.join(basePath, 'team.json'), data);
}

// ===================== FAQ =====================
export function getFaqDir(basePath: string) {
  return path.join(basePath, 'faq');
}

export function getFaqFiles(basePath: string) {
  return listJsonFiles(getFaqDir(basePath));
}

export function getFaqFile(basePath: string, filename: string) {
  return readJsonFile(path.join(getFaqDir(basePath), filename));
}

export function saveFaqFile(basePath: string, filename: string, data: unknown) {
  writeJsonFile(path.join(getFaqDir(basePath), filename), data);
}

// ===================== Policies =====================
export function getPoliciesDir(basePath: string) {
  return path.join(basePath, 'policies');
}

export function getPolicyFiles(basePath: string) {
  return listJsonFiles(getPoliciesDir(basePath));
}

export function getPolicyFile(basePath: string, filename: string) {
  return readJsonFile(path.join(getPoliciesDir(basePath), filename));
}

export function savePolicyFile(basePath: string, filename: string, data: unknown) {
  writeJsonFile(path.join(getPoliciesDir(basePath), filename), data);
}

// ===================== Dialogs =====================
export function getDialogsDir(basePath: string) {
  return path.join(basePath, 'dialogs');
}

export function getDialogFiles(basePath: string) {
  return listJsonFiles(getDialogsDir(basePath));
}

export function getDialogFile(basePath: string, filename: string) {
  return readJsonFile(path.join(getDialogsDir(basePath), filename));
}

export function saveDialogFile(basePath: string, filename: string, data: unknown) {
  const dir = getDialogsDir(basePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  writeJsonFile(path.join(dir, filename), data);
}

export function getDialogExamples(basePath: string) {
  const examplesPath = path.join(getDialogsDir(basePath), 'examples.json');
  if (!fs.existsSync(examplesPath)) return [];
  return readJsonFile(examplesPath);
}

export function saveDialogExamples(basePath: string, data: unknown) {
  saveDialogFile(basePath, 'examples.json', data);
}

// ===================== Metadata =====================
export function getMetadata(basePath: string) {
  const metaPath = path.join(basePath, 'metadata.json');
  if (!fs.existsSync(metaPath)) return {};
  return readJsonFile(metaPath);
}
