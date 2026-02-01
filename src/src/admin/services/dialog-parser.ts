import { v4 as uuidv4 } from 'uuid';
import { parse as csvParse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';

interface DialogMessage {
  role: 'client' | 'manager';
  text: string;
  intent?: string;
  emotion?: string;
  note?: string;
}

interface DialogExample {
  exampleId: string;
  situation: string;
  clientType: string;
  messages: DialogMessage[];
  outcome: string;
  quality: number;
  learnings: string[];
  keyPhrases: string[];
  tags: string[];
  metadata: Record<string, unknown>;
}

function generateId(): string {
  return `dialog-${uuidv4().slice(0, 8)}`;
}

function fillDefaults(partial: Partial<DialogExample>): DialogExample {
  return {
    exampleId: partial.exampleId || generateId(),
    situation: partial.situation || 'Imported dialog',
    clientType: partial.clientType || 'new',
    messages: partial.messages || [],
    outcome: partial.outcome || 'neutral',
    quality: partial.quality ?? 0.8,
    learnings: partial.learnings || [],
    keyPhrases: partial.keyPhrases || [],
    tags: partial.tags || ['imported'],
    metadata: partial.metadata || {},
  };
}

export function parseJSON(content: string): DialogExample[] {
  const data = JSON.parse(content);
  const arr = Array.isArray(data) ? data : [data];
  return arr.map((item: any) => fillDefaults(item));
}

export function parseCSV(content: string): DialogExample[] {
  const records = csvParse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  });

  const groups = new Map<string, { meta: any; messages: DialogMessage[] }>();

  for (const record of records) {
    const row = record as any;
    const key = row.dialog_id || row.situation || 'default';
    if (!groups.has(key)) {
      groups.set(key, {
        meta: {
          situation: row.situation || key,
          clientType: row.client_type || 'new',
          outcome: row.outcome || 'neutral',
          quality: row.quality ? parseFloat(row.quality) : 0.8,
        },
        messages: [],
      });
    }
    const group = groups.get(key)!;
    group.messages.push({
      role: (row.role === 'manager' || row.role === 'М') ? 'manager' : 'client',
      text: row.text || '',
      intent: row.intent || undefined,
      emotion: row.emotion || undefined,
    });
  }

  return Array.from(groups.values()).map(({ meta, messages }) =>
    fillDefaults({ ...meta, messages }),
  );
}

export function parseTXT(content: string): DialogExample[] {
  const blocks = content.split(/\n---+\n|\n\n\n+/).filter((b) => b.trim());
  const dialogs: DialogExample[] = [];

  for (const block of blocks) {
    const lines = block.trim().split('\n').filter((l) => l.trim());
    if (lines.length === 0) continue;

    let situation = 'Imported dialog';
    const messages: DialogMessage[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      const clientMatch = trimmed.match(/^(?:Клиент|К|Client|C):\s*(.+)/i);
      const managerMatch = trimmed.match(/^(?:Менеджер|М|Manager|M):\s*(.+)/i);

      if (clientMatch) {
        messages.push({ role: 'client', text: clientMatch[1] });
      } else if (managerMatch) {
        messages.push({ role: 'manager', text: managerMatch[1] });
      } else if (messages.length === 0) {
        situation = trimmed;
      }
    }

    if (messages.length > 0) {
      dialogs.push(fillDefaults({ situation, messages }));
    }
  }

  return dialogs;
}

export function parseXLSX(buffer: Buffer): DialogExample[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const csvContent = XLSX.utils.sheet_to_csv(sheet);
  return parseCSV(csvContent);
}

export function parseDialogFile(
  buffer: Buffer,
  filename: string,
  format?: string,
): DialogExample[] {
  const ext = format || filename.split('.').pop()?.toLowerCase() || '';
  const content = buffer.toString('utf-8');

  switch (ext) {
    case 'json':
      return parseJSON(content);
    case 'csv':
      return parseCSV(content);
    case 'txt':
      return parseTXT(content);
    case 'xlsx':
    case 'xls':
      return parseXLSX(buffer);
    default:
      throw new Error(`Unsupported format: ${ext}`);
  }
}
