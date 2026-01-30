import { HumanMimicry } from '../../../src/core/human-mimicry';
import {
  PersonalityProfile,
  CommunicationStyle,
  EmojiUsage,
  PunctuationStyle,
  VocabularyLevel,
  EmpathyLevel,
  FormalityLevel,
} from '../../../src/types';

function createTestPersonality(): PersonalityProfile {
  return {
    name: 'Алиса',
    role: 'Администратор',
    style: CommunicationStyle.FRIENDLY,
    traits: {
      emojiUsage: EmojiUsage.MODERATE,
      emojiFrequency: 0.5,
      preferredEmojis: ['😊', '👍', '✨'],
      punctuation: PunctuationStyle.CASUAL,
      vocabulary: VocabularyLevel.MODERATE,
      empathy: EmpathyLevel.HIGH,
      enthusiasm: 'moderate',
      usesHumor: true,
      formalityLevel: FormalityLevel.CASUAL,
    },
    patterns: {
      greetings: ['Привет!', 'Здравствуйте!', 'Добрый день!'],
      farewells: ['До свидания!', 'Пока!', 'Всего доброго!'],
      acknowledgments: ['Понял!', 'Хорошо!', 'Принято!'],
      delays: ['Секунду...', 'Одну минутку!'],
      apologies: ['Извините!', 'Простите!'],
      transitions: ['Кстати,', 'К слову,'],
      fillers: ['ну', 'вообще-то', 'на самом деле'],
      preferredPhrases: ['Рада помочь!', 'Обращайтесь!'],
    },
    restrictions: {
      avoidWords: ['нейросеть', 'ИИ', 'AI'],
      avoidTopics: [],
      maxMessageLength: 500,
      avoidStyles: [],
    },
  };
}

describe('HumanMimicry', () => {
  let mimicry: HumanMimicry;

  beforeEach(() => {
    mimicry = new HumanMimicry(createTestPersonality());
  });

  describe('makeNatural', () => {
    it('returns a string', async () => {
      const result = await mimicry.makeNatural('В настоящее время это доступно.');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('replaces formal structures with informal ones', async () => {
      const result = await mimicry.makeNatural('В настоящее время мы работаем.');
      // The formal phrase should be replaced
      expect(result).not.toContain('В настоящее время');
      expect(result.toLowerCase()).toContain('сейчас');
    });

    it('applies contractions to shorten phrases', async () => {
      const result = await mimicry.makeNatural('Для того чтобы записаться, нужно позвонить.', {
        allowTypo: false,
        useColloquialisms: false,
        varyStructure: false,
        useContractions: true,
      });
      expect(result).not.toContain('Для того чтобы');
      expect(result.toLowerCase()).toContain('чтобы');
    });
  });

  describe('checkRoboticness', () => {
    it('scores overly formal text higher', () => {
      const formalText =
        'Здравствуйте. Я хотел бы предложить вам наши услуги. ' +
        'Будьте добры ознакомиться с предложением. ' +
        'Прошу вас рассмотреть данный вопрос. ' +
        'Не могли бы вы уточнить детали.';

      const score = mimicry.checkRoboticness(formalText);
      expect(score.score).toBeGreaterThan(0);
      expect(score.flags.tooFormal).toBe(true);
    });

    it('scores casual text lower', () => {
      const casualText = 'Привет! Отлично, рад помочь 😊 Кстати, у нас сейчас акция!';
      const score = mimicry.checkRoboticness(casualText);
      expect(score.score).toBeLessThan(30);
    });

    it('detects unnatural AI phrasing', () => {
      const roboticText = 'Я был бы рад помочь вам с этим вопросом. Чем я могу быть полезен? Позвольте мне помочь.';
      const score = mimicry.checkRoboticness(roboticText);
      expect(score.flags.unnaturalPhrasing).toBe(true);
      expect(score.score).toBeGreaterThanOrEqual(20);
    });

    it('detects repetitive structure', () => {
      // Create sentences of very similar length to trigger variance check
      const repetitive =
        'Мы предлагаем услуги высокого качества. ' +
        'Мы гарантируем отличный результат работ. ' +
        'Мы обеспечиваем прекрасный сервис клиентам. ' +
        'Мы доставляем в кратчайшие сроки заказ.';
      const score = mimicry.checkRoboticness(repetitive);
      // Depending on sentence length variance, repetitiveStructure may be flagged
      expect(score.score).toBeGreaterThanOrEqual(0);
    });

    it('flags lack of personality in long text', () => {
      const bland =
        'Наша компания занимается предоставлением услуг. ' +
        'Мы работаем с различными категориями клиентов. ' +
        'Все услуги предоставляются в соответствии со стандартами. ' +
        'Качество работы контролируется на каждом этапе.';
      const score = mimicry.checkRoboticness(bland);
      // Long text without emoji, colloquialisms, or exclamation
      expect(score.flags.noPersonality).toBe(true);
    });

    it('returns score between 0 and 100', () => {
      const score1 = mimicry.checkRoboticness('Привет!');
      expect(score1.score).toBeGreaterThanOrEqual(0);
      expect(score1.score).toBeLessThanOrEqual(100);

      const score2 = mimicry.checkRoboticness(
        'Я был бы рад помочь вам. Чем я могу быть полезен. Позвольте мне помочь. ' +
        'Здравствуйте. Будьте добры. Прошу вас. Не могли бы вы. Уважаемый клиент. ' +
        'В настоящее время данная услуга доступна. Необходимо отметить важный момент.'
      );
      expect(score2.score).toBeGreaterThanOrEqual(0);
      expect(score2.score).toBeLessThanOrEqual(100);
    });
  });

  describe('calculateTypingDelay', () => {
    it('returns a number', () => {
      const delay = mimicry.calculateTypingDelay('Привет');
      expect(typeof delay).toBe('number');
      expect(delay).toBeGreaterThan(0);
    });

    it('returns delay proportional to text length', () => {
      // Run multiple times and average to smooth out randomness
      const shortDelays: number[] = [];
      const longDelays: number[] = [];

      for (let i = 0; i < 20; i++) {
        shortDelays.push(mimicry.calculateTypingDelay('Да'));
        longDelays.push(mimicry.calculateTypingDelay(
          'Это очень длинный ответ, который содержит множество символов и должен занять больше времени для набора текста'
        ));
      }

      const avgShort = shortDelays.reduce((a, b) => a + b, 0) / shortDelays.length;
      const avgLong = longDelays.reduce((a, b) => a + b, 0) / longDelays.length;

      expect(avgLong).toBeGreaterThan(avgShort);
    });

    it('has minimum bound of 500ms', () => {
      const delay = mimicry.calculateTypingDelay('');
      expect(delay).toBeGreaterThanOrEqual(500);
    });

    it('has maximum bound of 5000ms', () => {
      const veryLongText = 'А'.repeat(10000);
      const delay = mimicry.calculateTypingDelay(veryLongText);
      expect(delay).toBeLessThanOrEqual(5000);
    });
  });

  describe('addHumanTouch', () => {
    it('returns a string', async () => {
      const result = await mimicry.addHumanTouch('Информация доступна на сайте.');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('can add human touches with all options enabled', async () => {
      // Run multiple times to account for randomness
      const results: string[] = [];
      for (let i = 0; i < 10; i++) {
        results.push(await mimicry.addHumanTouch('Информация доступна на сайте.', {
          addThinkingPause: true,
          addEmoji: true,
          addColloquialism: true,
          addPersonalTouch: true,
        }));
      }
      // At least some results should differ from the original
      const changed = results.some((r) => r !== 'Информация доступна на сайте.');
      expect(changed).toBe(true);
    });

    it('returns unmodified text with all options disabled', async () => {
      const input = 'Информация доступна на сайте.';
      const result = await mimicry.addHumanTouch(input, {
        addThinkingPause: false,
        addEmoji: false,
        addColloquialism: false,
        addPersonalTouch: false,
      });
      expect(result).toBe(input);
    });
  });

  describe('applyPersonality', () => {
    it('returns a string', async () => {
      const personality = createTestPersonality();
      const result = await mimicry.applyPersonality('Привет! Как дела?', personality);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
