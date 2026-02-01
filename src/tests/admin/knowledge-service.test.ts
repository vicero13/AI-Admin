import fs from 'fs';
import path from 'path';
import os from 'os';
import * as ks from '../../src/admin/services/knowledge-service';

describe('Knowledge Service', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kb-test-'));
    // Create structure
    fs.writeFileSync(path.join(tmpDir, 'business-info.json'), JSON.stringify({ name: 'Test' }));
    fs.writeFileSync(path.join(tmpDir, 'services.json'), JSON.stringify([{ id: 1, name: 'Svc' }]));
    fs.writeFileSync(path.join(tmpDir, 'team.json'), JSON.stringify({ members: [] }));
    fs.mkdirSync(path.join(tmpDir, 'faq'));
    fs.writeFileSync(path.join(tmpDir, 'faq', 'general.json'), JSON.stringify([{ q: 'Hello?' }]));
    fs.mkdirSync(path.join(tmpDir, 'policies'));
    fs.writeFileSync(path.join(tmpDir, 'policies', 'rules.json'), JSON.stringify([{ title: 'Rule1' }]));
    fs.mkdirSync(path.join(tmpDir, 'dialogs'));
    fs.writeFileSync(path.join(tmpDir, 'dialogs', 'examples.json'), JSON.stringify([]));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('getBusinessInfo reads business-info.json', () => {
    const data = ks.getBusinessInfo(tmpDir);
    expect(data).toEqual({ name: 'Test' });
  });

  test('saveBusinessInfo writes and creates backup', () => {
    ks.saveBusinessInfo(tmpDir, { name: 'Updated' });
    const data = ks.getBusinessInfo(tmpDir);
    expect(data).toEqual({ name: 'Updated' });
    expect(fs.existsSync(path.join(tmpDir, '.backups'))).toBe(true);
  });

  test('getServices reads services.json', () => {
    const data = ks.getServices(tmpDir) as any[];
    expect(data).toHaveLength(1);
    expect(data[0].name).toBe('Svc');
  });

  test('saveServices writes array', () => {
    ks.saveServices(tmpDir, [{ id: 1 }, { id: 2 }]);
    const data = ks.getServices(tmpDir) as any[];
    expect(data).toHaveLength(2);
  });

  test('getTeam reads team.json', () => {
    expect(ks.getTeam(tmpDir)).toEqual({ members: [] });
  });

  test('getFaqFiles lists FAQ json files', () => {
    const files = ks.getFaqFiles(tmpDir);
    expect(files).toEqual(['general.json']);
  });

  test('getFaqFile reads specific FAQ file', () => {
    const data = ks.getFaqFile(tmpDir, 'general.json') as any[];
    expect(data[0].q).toBe('Hello?');
  });

  test('saveFaqFile writes FAQ file', () => {
    ks.saveFaqFile(tmpDir, 'general.json', [{ q: 'Updated' }]);
    const data = ks.getFaqFile(tmpDir, 'general.json') as any[];
    expect(data[0].q).toBe('Updated');
  });

  test('getPolicyFiles lists policy files', () => {
    expect(ks.getPolicyFiles(tmpDir)).toEqual(['rules.json']);
  });

  test('getDialogExamples reads empty array', () => {
    expect(ks.getDialogExamples(tmpDir)).toEqual([]);
  });

  test('saveDialogExamples writes dialogs', () => {
    const dialogs = [{ exampleId: 'test', situation: 'test' }];
    ks.saveDialogExamples(tmpDir, dialogs);
    expect(ks.getDialogExamples(tmpDir)).toEqual(dialogs);
  });

  test('listJsonFiles returns empty for missing dir', () => {
    expect(ks.listJsonFiles(path.join(tmpDir, 'nonexistent'))).toEqual([]);
  });
});
