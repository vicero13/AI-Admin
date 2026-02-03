import { Router, Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import * as ks from '../services/knowledge-service';
import { readConfig } from '../services/config-service';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface KBChange {
  file: string;
  operation: 'update' | 'delete_item' | 'add_item' | 'replace_file';
  path?: string;
  newValue?: unknown;
  description: string;
}

// In-memory chat histories per session
const chatHistories = new Map<string, ChatMessage[]>();

function getAnthropicApiKey(): string {
  // 1. Try env var
  if (process.env.ANTHROPIC_API_KEY) {
    return process.env.ANTHROPIC_API_KEY;
  }
  // 2. Try reading from config
  try {
    const config = readConfig();
    const ai = config.ai as any;
    if (ai?.metadata?.apiKey) return ai.metadata.apiKey;
  } catch {
    // ignore
  }
  throw new Error('ANTHROPIC_API_KEY not found in env or config');
}

function buildKnowledgeSnapshot(): string {
  const parts: string[] = [];

  try {
    const businessInfo = ks.getBusinessInfo();
    parts.push(`=== business-info.json ===\n${JSON.stringify(businessInfo, null, 2)}`);
  } catch { /* file may not exist */ }

  try {
    const services = ks.getServices();
    parts.push(`=== services.json ===\n${JSON.stringify(services, null, 2)}`);
  } catch { /* */ }

  try {
    const faqFiles = ks.getFaqFiles();
    for (const f of faqFiles) {
      const data = ks.getFaqFile(f);
      parts.push(`=== faq/${f} ===\n${JSON.stringify(data, null, 2)}`);
    }
  } catch { /* */ }

  try {
    const policyFiles = ks.getPolicyFiles();
    for (const f of policyFiles) {
      const data = ks.getPolicyFile(f);
      parts.push(`=== policies/${f} ===\n${JSON.stringify(data, null, 2)}`);
    }
  } catch { /* */ }

  try {
    const team = ks.getTeam();
    parts.push(`=== team.json ===\n${JSON.stringify(team, null, 2)}`);
  } catch { /* */ }

  return parts.join('\n\n');
}

function applyChanges(changes: KBChange[]): { applied: number; errors: string[] } {
  let applied = 0;
  const errors: string[] = [];

  for (const change of changes) {
    try {
      const { file, operation, newValue } = change;

      if (operation === 'replace_file') {
        // Replace entire file content
        writeToFile(file, newValue);
        applied++;
        continue;
      }

      // Read current file content
      const currentData = readFile(file);

      if (operation === 'delete_item') {
        if (Array.isArray(currentData) && change.path) {
          const index = parseArrayIndex(change.path);
          if (index !== null && index >= 0 && index < currentData.length) {
            currentData.splice(index, 1);
            writeToFile(file, currentData);
            applied++;
          } else {
            // Try to find by id or serviceId
            const idMatch = change.path.match(/id=(.+)/);
            if (idMatch) {
              const id = idMatch[1];
              const idx = currentData.findIndex((item: any) =>
                item.id === id || item.serviceId === id || item.faqId === id
              );
              if (idx >= 0) {
                currentData.splice(idx, 1);
                writeToFile(file, currentData);
                applied++;
              } else {
                errors.push(`Item with id="${id}" not found in ${file}`);
              }
            } else {
              errors.push(`Invalid path "${change.path}" for delete_item in ${file}`);
            }
          }
        } else {
          errors.push(`Cannot delete_item: ${file} is not an array or path is missing`);
        }
      } else if (operation === 'add_item') {
        if (Array.isArray(currentData)) {
          currentData.push(newValue);
          writeToFile(file, currentData);
          applied++;
        } else {
          errors.push(`Cannot add_item: ${file} is not an array`);
        }
      } else if (operation === 'update') {
        if (Array.isArray(currentData) && change.path) {
          const index = parseArrayIndex(change.path);
          if (index !== null && index >= 0 && index < currentData.length) {
            currentData[index] = { ...currentData[index], ...(newValue as any) };
            writeToFile(file, currentData);
            applied++;
          } else {
            // Try to find by id
            const idMatch = change.path.match(/id=(.+)/);
            if (idMatch) {
              const id = idMatch[1];
              const idx = currentData.findIndex((item: any) =>
                item.id === id || item.serviceId === id || item.faqId === id
              );
              if (idx >= 0) {
                currentData[idx] = { ...currentData[idx], ...(newValue as any) };
                writeToFile(file, currentData);
                applied++;
              } else {
                errors.push(`Item with id="${id}" not found in ${file}`);
              }
            } else {
              errors.push(`Invalid path "${change.path}" for update in ${file}`);
            }
          }
        } else if (!Array.isArray(currentData) && typeof currentData === 'object') {
          // Object — merge
          const merged = { ...(currentData as any), ...(newValue as any) };
          writeToFile(file, merged);
          applied++;
        } else {
          errors.push(`Cannot update: unexpected data type in ${file}`);
        }
      }
    } catch (err: any) {
      errors.push(`Error processing change for ${change.file}: ${err.message}`);
    }
  }

  return { applied, errors };
}

function readFile(file: string): unknown {
  if (file === 'business-info.json') return ks.getBusinessInfo();
  if (file === 'services.json') return ks.getServices();
  if (file === 'team.json') return ks.getTeam();
  if (file.startsWith('faq/')) return ks.getFaqFile(file.replace('faq/', ''));
  if (file.startsWith('policies/')) return ks.getPolicyFile(file.replace('policies/', ''));
  throw new Error(`Unknown file: ${file}`);
}

function writeToFile(file: string, data: unknown): void {
  if (file === 'business-info.json') { ks.saveBusinessInfo(data); return; }
  if (file === 'services.json') { ks.saveServices(data); return; }
  if (file === 'team.json') { ks.saveTeam(data); return; }
  if (file.startsWith('faq/')) { ks.saveFaqFile(file.replace('faq/', ''), data); return; }
  if (file.startsWith('policies/')) { ks.savePolicyFile(file.replace('policies/', ''), data); return; }
  throw new Error(`Unknown file: ${file}`);
}

function parseArrayIndex(path: string): number | null {
  const match = path.match(/^\[(\d+)\]$/);
  return match ? parseInt(match[1], 10) : null;
}

const router = Router();

// Send message to AI knowledge assistant
router.post('/message', async (req: Request, res: Response) => {
  try {
    const { message, sessionId = 'default' } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    const apiKey = getAnthropicApiKey();
    const client = new Anthropic({ apiKey });

    // Get or create chat history
    if (!chatHistories.has(sessionId)) {
      chatHistories.set(sessionId, []);
    }
    const history = chatHistories.get(sessionId)!;

    // Add user message
    history.push({ role: 'user', content: message });

    const knowledgeSnapshot = buildKnowledgeSnapshot();

    const systemPrompt = `Ты — ассистент администратора для управления базой знаний сети коворкингов ElasticSpace.

Текущее состояние базы знаний:

${knowledgeSnapshot}

Твоя задача — помогать администратору обновлять базу знаний через текстовые инструкции.

Когда администратор просит что-то изменить (добавить, удалить, обновить данные), верни JSON в code fences с ТОЧНО таким форматом:

\`\`\`json
{
  "action": "modify",
  "changes": [
    {
      "file": "services.json",
      "operation": "delete_item",
      "path": "id=sokol-4-120",
      "description": "Удалить домик на 4 места за 120к (сдан)"
    },
    {
      "file": "services.json",
      "operation": "update",
      "path": "id=sokol-6-216",
      "newValue": {
        "name": "Офис №4 на 6 мест (Сокол)",
        "description": "Офис №4 на 6 рабочих мест в основном доме на локации Сокол."
      },
      "description": "Переименовать домик на 6 мест в Офис №4"
    }
  ],
  "summary": "Краткое описание всех изменений на русском"
}
\`\`\`

Доступные файлы: business-info.json, services.json, team.json, faq/general.json, faq/pricing.json, faq/booking.json, policies/cancellation.json, policies/refund.json, policies/rules.json.

Доступные операции:
- "delete_item" — удалить элемент из массива. path: "id=<значение>" для поиска по id/serviceId/faqId, или "[N]" для индекса.
- "add_item" — добавить элемент в массив. newValue: полный объект нового элемента.
- "update" — обновить элемент. path: "id=<значение>" или "[N]". newValue: поля для обновления (merge).
- "replace_file" — заменить содержимое файла целиком. newValue: новое содержимое.

ВАЖНО:
- При update передавай в newValue ТОЛЬКО изменяемые поля, не весь объект.
- При add_item передавай ПОЛНЫЙ объект с теми же полями что у существующих элементов.
- При delete_item — newValue не нужен.
- Всегда отвечай на русском языке.
- Если запрос непонятен — уточни.
- Если запрос не связан с изменением данных — просто ответь текстом без JSON.
- Обязательно обновляй ВСЕ связанные файлы. Например, если офис удаляется из services.json, обнови и FAQ где упоминается этот офис.`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    });

    const aiContent = response.content[0];
    if (aiContent.type !== 'text') {
      return res.status(500).json({ error: 'Unexpected AI response' });
    }

    const aiText = aiContent.text;
    history.push({ role: 'assistant', content: aiText });

    // Try to extract JSON changes from response
    const jsonMatch = aiText.match(/```json\n?([\s\S]*?)\n?```/);
    let changes = null;

    if (jsonMatch) {
      try {
        changes = JSON.parse(jsonMatch[1]);
      } catch {
        // Not valid JSON, return as text
      }
    }

    res.json({
      response: aiText,
      changes,
      hasChanges: changes !== null && changes?.action === 'modify',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Apply changes from AI suggestion
router.post('/apply', (req: Request, res: Response) => {
  try {
    const { changes } = req.body;

    if (!changes || !Array.isArray(changes)) {
      return res.status(400).json({ error: 'changes array is required' });
    }

    const result = applyChanges(changes);

    res.json({
      success: result.errors.length === 0,
      applied: result.applied,
      errors: result.errors,
      message: result.errors.length === 0
        ? `Применено ${result.applied} изменений`
        : `Применено ${result.applied} изменений, ошибки: ${result.errors.join('; ')}`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Clear chat history
router.post('/clear', (req: Request, res: Response) => {
  const { sessionId = 'default' } = req.body;
  chatHistories.delete(sessionId);
  res.json({ success: true });
});

export default router;
