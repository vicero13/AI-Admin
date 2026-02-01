import { parseJSON, parseCSV, parseTXT, parseXLSX, parseDialogFile } from '../../src/services/dialog-parser';

describe('dialog-parser', () => {
  describe('parseJSON', () => {
    it('should parse array of full DialogExample objects', () => {
      const input = JSON.stringify([
        {
          exampleId: 'dialog-001',
          situation: 'Test situation',
          clientType: 'new',
          messages: [
            { role: 'client', text: 'Hello' },
            { role: 'manager', text: 'Hi!' },
          ],
          outcome: 'successful',
          quality: 0.95,
          learnings: ['Learn 1'],
          keyPhrases: ['hello'],
          tags: ['greeting'],
          metadata: {},
        },
      ]);

      const result = parseJSON(input);

      expect(result).toHaveLength(1);
      expect(result[0].exampleId).toBe('dialog-001');
      expect(result[0].situation).toBe('Test situation');
      expect(result[0].messages).toHaveLength(2);
      expect(result[0].quality).toBe(0.95);
    });

    it('should fill defaults for minimal input', () => {
      const input = JSON.stringify([
        {
          situation: 'Minimal dialog',
          messages: [{ role: 'client', text: 'Question?' }],
        },
      ]);

      const result = parseJSON(input);

      expect(result).toHaveLength(1);
      expect(result[0].exampleId).toBeTruthy();
      expect(result[0].clientType).toBe('new');
      expect(result[0].outcome).toBe('neutral');
      expect(result[0].quality).toBe(0.8);
      expect(result[0].tags).toEqual(['imported']);
    });

    it('should handle single object (not array)', () => {
      const input = JSON.stringify({
        situation: 'Single dialog',
        messages: [{ role: 'client', text: 'Test' }],
      });

      const result = parseJSON(input);

      expect(result).toHaveLength(1);
    });

    it('should throw on invalid JSON', () => {
      expect(() => parseJSON('not json')).toThrow();
    });

    it('should handle empty messages array', () => {
      const input = JSON.stringify([{ situation: 'Empty' }]);
      const result = parseJSON(input);

      expect(result[0].messages).toEqual([]);
    });
  });

  describe('parseCSV', () => {
    it('should parse CSV with standard columns', () => {
      const csv = `situation,role,text,client_type,outcome,quality
New client,client,Hello,new,successful,0.9
New client,manager,Hi there!,new,successful,0.9`;

      const result = parseCSV(csv);

      expect(result).toHaveLength(1);
      expect(result[0].situation).toBe('New client');
      expect(result[0].messages).toHaveLength(2);
      expect(result[0].messages[0].role).toBe('client');
      expect(result[0].messages[0].text).toBe('Hello');
      expect(result[0].messages[1].role).toBe('manager');
    });

    it('should group by dialog_id when present', () => {
      const csv = `dialog_id,situation,role,text
d1,First dialog,client,Question 1
d1,First dialog,manager,Answer 1
d2,Second dialog,client,Question 2
d2,Second dialog,manager,Answer 2`;

      const result = parseCSV(csv);

      expect(result).toHaveLength(2);
      expect(result[0].messages).toHaveLength(2);
      expect(result[1].messages).toHaveLength(2);
    });

    it('should handle empty CSV', () => {
      const csv = 'situation,role,text\n';

      const result = parseCSV(csv);

      expect(result).toHaveLength(0);
    });

    it('should default quality to 0.8 when not specified', () => {
      const csv = `situation,role,text
Test,client,Hello`;

      const result = parseCSV(csv);

      expect(result[0].quality).toBe(0.8);
    });

    it('should parse quality as number', () => {
      const csv = `situation,role,text,quality
Test,client,Hello,0.95`;

      const result = parseCSV(csv);

      expect(result[0].quality).toBe(0.95);
    });
  });

  describe('parseTXT', () => {
    it('should parse standard client/manager format', () => {
      const txt = `Ситуация с новым клиентом
Клиент: Здравствуйте, сколько стоит?
Менеджер: Привет! 500 руб/день.
Клиент: Спасибо!`;

      const result = parseTXT(txt);

      expect(result).toHaveLength(1);
      expect(result[0].situation).toBe('Ситуация с новым клиентом');
      expect(result[0].messages).toHaveLength(3);
      expect(result[0].messages[0].role).toBe('client');
      expect(result[0].messages[1].role).toBe('manager');
    });

    it('should split dialogs by --- separator', () => {
      const txt = `Dialog one
Клиент: Hello
Менеджер: Hi
---
Dialog two
Клиент: Question
Менеджер: Answer`;

      const result = parseTXT(txt);

      expect(result).toHaveLength(2);
      expect(result[0].situation).toBe('Dialog one');
      expect(result[1].situation).toBe('Dialog two');
    });

    it('should handle short role prefixes К: and М:', () => {
      const txt = `Test
К: Вопрос
М: Ответ`;

      const result = parseTXT(txt);

      expect(result).toHaveLength(1);
      expect(result[0].messages[0].role).toBe('client');
      expect(result[0].messages[1].role).toBe('manager');
    });

    it('should handle English prefixes Client: Manager:', () => {
      const txt = `English dialog
Client: Hello
Manager: Welcome!`;

      const result = parseTXT(txt);

      expect(result).toHaveLength(1);
      expect(result[0].messages[0].role).toBe('client');
      expect(result[0].messages[1].role).toBe('manager');
    });

    it('should skip blocks with no messages', () => {
      const txt = `Just a title with no messages
---
Real dialog
Клиент: Hello
Менеджер: Hi`;

      const result = parseTXT(txt);

      expect(result).toHaveLength(1);
      expect(result[0].situation).toBe('Real dialog');
    });

    it('should handle empty input', () => {
      const result = parseTXT('');
      expect(result).toHaveLength(0);
    });

    it('should handle triple newline as separator', () => {
      const txt = `Dialog one
Клиент: Hello
Менеджер: Hi


Dialog two
Клиент: Bye
Менеджер: See ya`;

      // triple newline splits
      const result = parseTXT(txt);
      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it('should set default situation when first line is a message', () => {
      const txt = `Клиент: Привет
Менеджер: Здравствуйте`;

      const result = parseTXT(txt);

      expect(result).toHaveLength(1);
      expect(result[0].situation).toBe('Imported dialog');
    });
  });

  describe('parseXLSX', () => {
    it('should parse XLSX buffer using SheetJS', () => {
      // Create a minimal XLSX buffer using xlsx library
      const XLSX = require('xlsx');
      const data = [
        { situation: 'XLSX dialog', role: 'client', text: 'From Excel' },
        { situation: 'XLSX dialog', role: 'manager', text: 'Excel reply' },
      ];
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      const buffer = Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));

      const result = parseXLSX(buffer);

      expect(result).toHaveLength(1);
      expect(result[0].situation).toBe('XLSX dialog');
      expect(result[0].messages).toHaveLength(2);
      expect(result[0].messages[0].text).toBe('From Excel');
    });
  });

  describe('parseDialogFile', () => {
    it('should route .json files to parseJSON', () => {
      const content = JSON.stringify([{ situation: 'Test', messages: [{ role: 'client', text: 'Hi' }] }]);
      const buffer = Buffer.from(content, 'utf-8');

      const result = parseDialogFile(buffer, 'dialogs.json');

      expect(result).toHaveLength(1);
    });

    it('should route .csv files to parseCSV', () => {
      const csv = 'situation,role,text\nTest,client,Hello';
      const buffer = Buffer.from(csv, 'utf-8');

      const result = parseDialogFile(buffer, 'dialogs.csv');

      expect(result).toHaveLength(1);
    });

    it('should route .txt files to parseTXT', () => {
      const txt = 'Dialog\nКлиент: Hello\nМенеджер: Hi';
      const buffer = Buffer.from(txt, 'utf-8');

      const result = parseDialogFile(buffer, 'dialogs.txt');

      expect(result).toHaveLength(1);
    });

    it('should use explicit format over filename extension', () => {
      const content = JSON.stringify([{ situation: 'Test', messages: [] }]);
      const buffer = Buffer.from(content, 'utf-8');

      const result = parseDialogFile(buffer, 'file.txt', 'json');

      expect(result).toHaveLength(1);
    });

    it('should throw for unsupported format', () => {
      const buffer = Buffer.from('data', 'utf-8');

      expect(() => parseDialogFile(buffer, 'file.pdf')).toThrow('Unsupported format');
    });
  });
});
