import { parseJSON, parseCSV, parseTXT, parseDialogFile } from '../../src/admin/services/dialog-parser';

describe('Dialog Parser', () => {
  describe('parseJSON', () => {
    test('parses JSON array', () => {
      const input = JSON.stringify([
        { situation: 'Test', messages: [{ role: 'client', text: 'Hello' }] },
      ]);
      const result = parseJSON(input);
      expect(result).toHaveLength(1);
      expect(result[0].situation).toBe('Test');
      expect(result[0].messages[0].text).toBe('Hello');
      expect(result[0].exampleId).toBeTruthy();
    });

    test('parses single object as array', () => {
      const input = JSON.stringify({ situation: 'Single' });
      const result = parseJSON(input);
      expect(result).toHaveLength(1);
      expect(result[0].situation).toBe('Single');
    });

    test('fills defaults', () => {
      const input = JSON.stringify([{}]);
      const result = parseJSON(input);
      expect(result[0].clientType).toBe('new');
      expect(result[0].outcome).toBe('neutral');
      expect(result[0].quality).toBe(0.8);
      expect(result[0].tags).toContain('imported');
    });
  });

  describe('parseCSV', () => {
    test('parses CSV with grouping', () => {
      const csv = `dialog_id,role,text,situation
d1,client,Hello,Greeting
d1,manager,Hi there!,Greeting
d2,client,Pricing?,Pricing inquiry`;
      const result = parseCSV(csv);
      expect(result).toHaveLength(2);
      expect(result[0].messages).toHaveLength(2);
      expect(result[0].situation).toBe('Greeting');
      expect(result[1].messages).toHaveLength(1);
    });

    test('handles manager role aliases', () => {
      const csv = `role,text\nМ,Привет`;
      const result = parseCSV(csv);
      expect(result[0].messages[0].role).toBe('manager');
    });
  });

  describe('parseTXT', () => {
    test('parses Client/Manager format', () => {
      const txt = `Greeting scenario
Client: Hello
Manager: Hi, how can I help?
Client: I need info
Manager: Sure!`;
      const result = parseTXT(txt);
      expect(result).toHaveLength(1);
      expect(result[0].situation).toBe('Greeting scenario');
      expect(result[0].messages).toHaveLength(4);
    });

    test('splits by --- separator', () => {
      const txt = `Client: Hello
Manager: Hi
---
Client: Bye
Manager: Goodbye`;
      const result = parseTXT(txt);
      expect(result).toHaveLength(2);
    });

    test('handles Russian labels', () => {
      const txt = `Клиент: Привет
Менеджер: Здравствуйте!`;
      const result = parseTXT(txt);
      expect(result[0].messages[0].role).toBe('client');
      expect(result[0].messages[1].role).toBe('manager');
    });
  });

  describe('parseDialogFile', () => {
    test('detects JSON format', () => {
      const buf = Buffer.from(JSON.stringify([{ situation: 'Test' }]));
      const result = parseDialogFile(buf, 'test.json');
      expect(result).toHaveLength(1);
    });

    test('detects TXT format', () => {
      const buf = Buffer.from('Client: Hi\nManager: Hello');
      const result = parseDialogFile(buf, 'test.txt');
      expect(result).toHaveLength(1);
    });

    test('throws on unsupported format', () => {
      expect(() => parseDialogFile(Buffer.from(''), 'test.xyz')).toThrow('Unsupported format');
    });
  });
});
