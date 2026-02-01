import { Router, Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import type { AdminDependencies } from '../index';

const SCHEMAS: Record<string, string> = {
  faq: `{
  "faqId": "unique-id",
  "question": "Question text",
  "answer": "Answer text",
  "category": "general|pricing|booking|services|policies|location|team|technical",
  "alternativeQuestions": ["variant1", "variant2"],
  "tags": ["tag1", "tag2"],
  "popularity": 0
}`,
  service: `{
  "serviceId": "unique-id",
  "name": "Service name",
  "description": "Service description",
  "pricing": { "amount": 0, "currency": "RUB", "period": "month" },
  "features": ["feature1", "feature2"],
  "availability": true,
  "tags": ["tag1"]
}`,
  dialog: `{
  "exampleId": "unique-id",
  "situation": "Situation description",
  "clientType": "new|returning|vip",
  "messages": [
    { "role": "client", "text": "Client message" },
    { "role": "manager", "text": "Manager response" }
  ],
  "outcome": "positive|neutral|negative",
  "quality": 0.8,
  "learnings": ["learning1"],
  "keyPhrases": ["phrase1"],
  "tags": ["tag1"]
}`,
  policy: `{
  "policyId": "unique-id",
  "title": "Policy title",
  "content": "Full policy text",
  "summary": "Brief summary",
  "keyPoints": ["point1", "point2"],
  "category": "general|booking|cancellation|safety|payment",
  "lastUpdated": "2024-01-01"
}`,
};

export function createConverterRouter(deps: AdminDependencies): Router {
  const router = Router();

  router.post('/', async (req: Request, res: Response) => {
    try {
      const { text, targetType } = req.body;

      if (!text || !targetType) {
        return res.status(400).json({ error: 'text and targetType are required' });
      }

      if (!SCHEMAS[targetType]) {
        return res.status(400).json({ error: `Invalid targetType. Valid: ${Object.keys(SCHEMAS).join(', ')}` });
      }

      if (text.length > 50000) {
        return res.status(400).json({ error: 'Text too long (max 50000 characters)' });
      }

      const client = new Anthropic({ apiKey: deps.anthropicApiKey });

      const prompt = `Convert the following text into a JSON array of ${targetType} items.

Schema for each item:
${SCHEMAS[targetType]}

Rules:
- Return ONLY a valid JSON array, no markdown, no explanation
- Generate unique IDs for each item
- Fill all required fields
- If information is missing, use reasonable defaults
- Text is in Russian, keep the content in Russian
- Extract as many items as possible from the text

Text to convert:
${text}`;

      const response = await client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        return res.status(500).json({ error: 'Unexpected AI response type' });
      }

      // Try to parse as JSON
      let parsed: unknown;
      try {
        // Strip markdown code fences if present
        let jsonText = content.text.trim();
        if (jsonText.startsWith('```')) {
          jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        }
        parsed = JSON.parse(jsonText);
      } catch {
        return res.status(422).json({
          error: 'AI response was not valid JSON',
          raw: content.text,
        });
      }

      const items = Array.isArray(parsed) ? parsed : [parsed];
      res.json({ items, count: items.length });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}
