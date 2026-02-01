import fs from 'fs';
import path from 'path';
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

export function listFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
}

export function getBusinessInfo() {
  return readJsonFile(path.join(PATHS.knowledgeBase, 'business-info.json'));
}

export function saveBusinessInfo(data: unknown) {
  writeJsonFile(path.join(PATHS.knowledgeBase, 'business-info.json'), data);
}

export function getServices() {
  return readJsonFile(path.join(PATHS.knowledgeBase, 'services.json'));
}

export function saveServices(data: unknown) {
  writeJsonFile(path.join(PATHS.knowledgeBase, 'services.json'), data);
}

export function getTeam() {
  return readJsonFile(path.join(PATHS.knowledgeBase, 'team.json'));
}

export function saveTeam(data: unknown) {
  writeJsonFile(path.join(PATHS.knowledgeBase, 'team.json'), data);
}

export function getMetadata() {
  return readJsonFile(path.join(PATHS.knowledgeBase, 'metadata.json'));
}

export function getFaqFiles() {
  return listFiles(PATHS.faq);
}

export function getFaqFile(filename: string) {
  return readJsonFile(path.join(PATHS.faq, filename));
}

export function saveFaqFile(filename: string, data: unknown) {
  writeJsonFile(path.join(PATHS.faq, filename), data);
}

export function getPolicyFiles() {
  return listFiles(PATHS.policies);
}

export function getPolicyFile(filename: string) {
  return readJsonFile(path.join(PATHS.policies, filename));
}

export function savePolicyFile(filename: string, data: unknown) {
  writeJsonFile(path.join(PATHS.policies, filename), data);
}

export function getDialogExamples() {
  return readJsonFile(PATHS.dialogExamples);
}

export function saveDialogExamples(data: unknown) {
  writeJsonFile(PATHS.dialogExamples, data);
}

export function getDialogFiles() {
  return listFiles(PATHS.dialogs);
}

export function getDialogFile(filename: string) {
  return readJsonFile(path.join(PATHS.dialogs, filename));
}
