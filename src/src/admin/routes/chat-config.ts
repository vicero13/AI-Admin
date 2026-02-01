import { Router, Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import * as configService from '../services/config-service';
import type { AdminDependencies } from '../index';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// In-memory chat history per session (simple approach)
const chatHistories = new Map<string, ChatMessage[]>();

export function createChatConfigRouter(deps: AdminDependencies): Router {
  const router = Router();

  // Send message to AI config assistant
  router.post('/message', async (req: Request, res: Response) => {
    try {
      const { message, sessionId = 'default' } = req.body;

      if (!message) {
        return res.status(400).json({ error: 'message is required' });
      }

      const currentConfig = configService.readConfig(deps.configPath);
      const configYaml = require('yaml').stringify(currentConfig);

      const client = new Anthropic({ apiKey: deps.anthropicApiKey });

      // Get or create chat history
      if (!chatHistories.has(sessionId)) {
        chatHistories.set(sessionId, []);
      }
      const history = chatHistories.get(sessionId)!;

      // Add user message
      history.push({ role: 'user', content: message });

      const systemPrompt = `You are a configuration assistant for an AI customer support agent.

Current configuration (YAML):
\`\`\`yaml
${configYaml}
\`\`\`

Your job is to help the user modify the configuration through natural language commands.

When the user asks to change something:
1. Identify which section and field to change
2. Return a JSON response with this EXACT format:
{
  "action": "modify",
  "changes": [
    {
      "section": "section_name",
      "path": "field.subfield",
      "oldValue": <current value>,
      "newValue": <new value>,
      "description": "Human-readable description of change"
    }
  ],
  "explanation": "Brief explanation of what will change"
}

If the user asks a question about the config (not a change), respond normally with text.
If the request is unclear, ask for clarification.
If you return a JSON modification, wrap it in \`\`\`json code fences.
Always respond in the same language the user uses (usually Russian).`;

      const response = await client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 2048,
        system: systemPrompt,
        messages: history.map(m => ({ role: m.role, content: m.content })),
      });

      const aiContent = response.content[0];
      if (aiContent.type !== 'text') {
        return res.status(500).json({ error: 'Unexpected AI response' });
      }

      const aiText = aiContent.text;
      history.push({ role: 'assistant', content: aiText });

      // Try to extract JSON changes from the response
      const jsonMatch = aiText.match(/```json\n?([\s\S]*?)\n?```/);
      let changes = null;

      if (jsonMatch) {
        try {
          changes = JSON.parse(jsonMatch[1]);
        } catch {
          // Not valid JSON, just return as text
        }
      }

      res.json({
        response: aiText,
        changes,
        hasChanges: changes !== null && changes?.action === 'modify',
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Apply changes from AI suggestion
  router.post('/apply', (req: Request, res: Response) => {
    try {
      const { changes } = req.body;

      if (!changes || !Array.isArray(changes)) {
        return res.status(400).json({ error: 'changes array is required' });
      }

      const config = configService.readConfig(deps.configPath);

      for (const change of changes) {
        const { section, path: fieldPath, newValue } = change;
        if (!section) continue;

        let target: any = config;
        if (!target[section]) target[section] = {};
        target = target[section];

        if (fieldPath) {
          const parts = fieldPath.split('.');
          for (let i = 0; i < parts.length - 1; i++) {
            if (!target[parts[i]]) target[parts[i]] = {};
            target = target[parts[i]];
          }
          target[parts[parts.length - 1]] = newValue;
        } else {
          (config as any)[section] = newValue;
        }
      }

      configService.writeConfig(deps.configPath, config);

      res.json({
        success: true,
        requiresRestart: true,
        message: 'Changes applied. Some changes may require restart.',
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Clear chat history
  router.post('/clear', (req: Request, res: Response) => {
    const { sessionId = 'default' } = req.body;
    chatHistories.delete(sessionId);
    res.json({ success: true });
  });

  return router;
}
