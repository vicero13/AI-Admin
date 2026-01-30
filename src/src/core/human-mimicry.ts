// ============================================================
// Human Mimicry Module — Модуль имитации человеческого общения
// ============================================================

import {
  PersonalityProfile,
  ClientProfile,
  ContextMessage,
  RoboticnessScore,
  RoboticnessFlags,
  CommunicationStyle,
  EmojiUsage,
  FormalityLevel,
  MessageRole,
} from '../types';

// --- Local option types ---

export interface NaturalnessOptions {
  allowTypo: boolean;
  useColloquialisms: boolean;
  varyStructure: boolean;
  useContractions: boolean;
}

export interface HumanTouchOptions {
  addThinkingPause: boolean;
  addEmoji: boolean;
  addColloquialism: boolean;
  addPersonalTouch: boolean;
}

// --- Dictionaries and constants ---

const COLLOQUIALISMS_RU: string[] = [
  'ну', 'кстати', 'в общем', 'короче', 'слушайте',
  'знаете', 'на самом деле', 'между прочим', 'вообще-то',
  'так вот', 'к слову', 'собственно', 'по сути',
];

const THINKING_PAUSES_RU: string[] = [
  'Хмм, ', 'Так, ', 'Дайте подумать... ', 'Секунду... ',
  'Ну смотрите, ', 'Вот что скажу, ', 'Давайте так, ',
  'Значит так, ', 'Окей, ', 'Смотрите, ',
];

const INFORMAL_MARKERS: string[] = [
  'привет', 'хай', 'здарова', 'ку', 'йо', 'хей',
  'плиз', 'спс', 'ок', 'норм', 'лан', 'пасиб', 'го',
  'чё', 'чо', 'щас', 'ваще', 'короч',
];

const FORMAL_MARKERS: string[] = [
  'здравствуйте', 'добрый день', 'уважаемый', 'прошу',
  'будьте добры', 'не могли бы', 'соблаговолите',
  'пожалуйста', 'благодарю', 'извините',
];

const EMOJI_SETS: Record<string, string[]> = {
  positive: ['😊', '👍', '✨', '🙌', '💪', '🎉', '😄'],
  neutral: ['👌', '📌', '✅', '🔹', '💡', '📍'],
  empathetic: ['🤗', '💛', '🙏', '❤️', '😌'],
  professional: ['📋', '✅', '📎', '🔔', '📩'],
};

const TYPO_MAP: Record<string, string> = {
  'что': 'чт',
  'это': 'эт',
  'можно': 'можн',
  'которые': 'которе',
  'пожалуйста': 'пожалуйсат',
  'спасибо': 'спасиб',
  'хорошо': 'хорош',
  'конечно': 'конечн',
  'например': 'наприме',
  'подскажите': 'подскажит',
};

const FORMAL_TO_INFORMAL: Record<string, string> = {
  'В настоящее время': 'Сейчас',
  'в настоящее время': 'сейчас',
  'Необходимо отметить': 'Стоит сказать',
  'необходимо отметить': 'стоит сказать',
  'В связи с тем, что': 'Потому что',
  'в связи с тем, что': 'потому что',
  'Данный': 'Этот',
  'данный': 'этот',
  'Данная': 'Эта',
  'данная': 'эта',
  'Данное': 'Это',
  'данное': 'это',
  'являться': 'быть',
  'является': 'это',
  'осуществлять': 'делать',
  'осуществить': 'сделать',
  'произвести оплату': 'оплатить',
  'в обязательном порядке': 'обязательно',
  'на данный момент': 'сейчас',
  'по данному вопросу': 'по этому вопросу',
  'предоставить информацию': 'рассказать',
  'довести до сведения': 'сообщить',
};

const WORD_VARIATIONS: Record<string, string[]> = {
  'хорошо': ['отлично', 'супер', 'замечательно', 'прекрасно', 'ладно'],
  'конечно': ['разумеется', 'безусловно', 'да, конечно', 'само собой'],
  'понятно': ['ясно', 'понял', 'окей', 'ага', 'угу'],
  'подождите': ['секундочку', 'минутку', 'одну секунду', 'момент'],
  'проблема': ['вопрос', 'ситуация', 'момент', 'нюанс'],
  'помочь': ['подсказать', 'помогу', 'разобраться', 'решить'],
  'сделать': ['оформить', 'организовать', 'устроить', 'подготовить'],
  'посмотреть': ['проверить', 'глянуть', 'взглянуть', 'уточнить'],
};

// --- Helper functions ---

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomInt(min: number, max: number): number {
  return Math.floor(randomFloat(min, max + 1));
}

function chance(percent: number): boolean {
  return Math.random() * 100 < percent;
}

// ============================================================
// HumanMimicry class
// ============================================================

export class HumanMimicry {
  private personality: PersonalityProfile;

  constructor(personality: PersonalityProfile) {
    this.personality = personality;
  }

  // ----------------------------------------------------------
  // 1. adaptToClientStyle
  // ----------------------------------------------------------

  async adaptToClientStyle(
    text: string,
    clientProfile: ClientProfile,
    recentMessages: ContextMessage[],
  ): Promise<string> {
    const detectedStyle = this.detectClientStyle(recentMessages);
    let result = text;

    if (
      detectedStyle === CommunicationStyle.CASUAL ||
      detectedStyle === CommunicationStyle.FRIENDLY
    ) {
      result = this.makeMoreInformal(result);
    }

    if (
      detectedStyle === CommunicationStyle.FORMAL ||
      detectedStyle === CommunicationStyle.PROFESSIONAL
    ) {
      result = this.ensureProfessional(result);
    }

    // Mirror client language length tendency
    const avgClientLen = this.averageMessageLength(recentMessages);
    if (avgClientLen > 0 && avgClientLen < 50 && result.length > 120) {
      result = this.shortenResponse(result);
    }

    return result;
  }

  // ----------------------------------------------------------
  // 2. makeNatural
  // ----------------------------------------------------------

  async makeNatural(text: string, options?: NaturalnessOptions): Promise<string> {
    const opts: NaturalnessOptions = options ?? {
      allowTypo: false,
      useColloquialisms: true,
      varyStructure: true,
      useContractions: true,
    };

    let result = text;

    // Remove overly formal structures
    result = this.removeFormalStructures(result);

    // Use contractions / shorter forms
    if (opts.useContractions) {
      result = this.applyContractions(result);
    }

    // Add occasional colloquialisms
    if (opts.useColloquialisms && chance(30)) {
      result = this.insertColloquialism(result);
    }

    // Vary sentence length
    if (opts.varyStructure) {
      result = this.varySentenceStructure(result);
    }

    // Very rarely add a minor typo (2% chance)
    if (opts.allowTypo && chance(2)) {
      result = this.introduceTypo(result);
    }

    return result;
  }

  // ----------------------------------------------------------
  // 3. applyPersonality
  // ----------------------------------------------------------

  async applyPersonality(
    text: string,
    personality: PersonalityProfile,
  ): Promise<string> {
    let result = text;

    // Add emoji based on personality settings
    result = this.applyEmojiByPersonality(result, personality);

    // Adjust formality
    result = this.adjustFormality(result, personality.traits.formalityLevel);

    // Apply speech patterns: greetings
    if (this.isGreetingContext(result) && personality.patterns.greetings.length > 0) {
      const greeting = randomChoice(personality.patterns.greetings);
      result = this.replaceGenericGreeting(result, greeting);
    }

    // Apply speech patterns: acknowledgments
    if (this.isAcknowledgmentContext(result) && personality.patterns.acknowledgments.length > 0) {
      const ack = randomChoice(personality.patterns.acknowledgments);
      result = this.insertAcknowledgment(result, ack);
    }

    // Apply preferred phrases occasionally
    if (personality.patterns.preferredPhrases.length > 0 && chance(20)) {
      result = this.sprinklePreferredPhrase(result, personality.patterns.preferredPhrases);
    }

    // Apply filler words occasionally based on enthusiasm
    if (personality.patterns.fillers.length > 0 && personality.traits.enthusiasm !== 'reserved') {
      const fillerChance = personality.traits.enthusiasm === 'energetic' ? 25 : 12;
      if (chance(fillerChance)) {
        const filler = randomChoice(personality.patterns.fillers);
        result = this.insertFiller(result, filler);
      }
    }

    return result;
  }

  // ----------------------------------------------------------
  // 4. calculateTypingDelay
  // ----------------------------------------------------------

  calculateTypingDelay(text: string): number {
    const baseDelay = 300;
    const perCharDelay = 50;
    const rawDelay = baseDelay + text.length * perCharDelay;

    // Random variation +-30%
    const variation = randomFloat(0.7, 1.3);
    const delay = Math.round(rawDelay * variation);

    // Clamp between 500ms and 5000ms
    return Math.max(500, Math.min(5000, delay));
  }

  // ----------------------------------------------------------
  // 5. addHumanTouch
  // ----------------------------------------------------------

  async addHumanTouch(text: string, options?: HumanTouchOptions): Promise<string> {
    const opts: HumanTouchOptions = options ?? {
      addThinkingPause: true,
      addEmoji: true,
      addColloquialism: true,
      addPersonalTouch: true,
    };

    let result = text;

    // Add thinking pauses like "Хмм, " or "Так, "
    if (opts.addThinkingPause && chance(25)) {
      const pause = randomChoice(THINKING_PAUSES_RU);
      // Only prepend if the text does not already start with one
      const startsWithPause = THINKING_PAUSES_RU.some((p) =>
        result.startsWith(p.trim()),
      );
      if (!startsWithPause) {
        // Lowercase the first letter of the original text when prepending
        result = pause + result.charAt(0).toLowerCase() + result.slice(1);
      }
    }

    // Add relevant emoji
    if (opts.addEmoji) {
      result = this.addContextualEmoji(result);
    }

    // Add colloquialisms
    if (opts.addColloquialism && chance(20)) {
      result = this.insertColloquialism(result);
    }

    // Add personal touch (e.g. "Рад помочь!" at the end)
    if (opts.addPersonalTouch && chance(15)) {
      const touches = [
        ' Рад помочь!',
        ' Обращайтесь!',
        ' Если что — пишите!',
        ' Всегда на связи!',
        ' Будут вопросы — спрашивайте!',
      ];
      result = result.trimEnd() + randomChoice(touches);
    }

    return result;
  }

  // ----------------------------------------------------------
  // 6. checkRoboticness
  // ----------------------------------------------------------

  checkRoboticness(text: string): RoboticnessScore {
    const flags: RoboticnessFlags = {
      tooFormal: false,
      tooPerfect: false,
      repetitiveStructure: false,
      unnaturalPhrasing: false,
      noPersonality: false,
      instantResponse: false,
      noEmotionalCues: false,
      overexplanation: false,
    };

    let score = 0;
    const suggestions: string[] = [];
    const examples: string[] = [];

    // --- Check: too formal ---
    const formalCount = FORMAL_MARKERS.filter((m) =>
      text.toLowerCase().includes(m),
    ).length;
    const formalPhraseCount = Object.keys(FORMAL_TO_INFORMAL).filter((p) =>
      text.toLowerCase().includes(p.toLowerCase()),
    ).length;
    if (formalCount >= 3 || formalPhraseCount >= 2) {
      flags.tooFormal = true;
      score += 15;
      suggestions.push('Замените формальные обороты на разговорные аналоги');
      examples.push('"В настоящее время" -> "Сейчас"');
    }

    // --- Check: too perfect grammar (no contractions, very even punctuation) ---
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const allEndWithPeriod = text.trim().endsWith('.');
    const noExclamations = !text.includes('!');
    const noEllipsis = !text.includes('...');
    if (allEndWithPeriod && noExclamations && noEllipsis && sentences.length > 2) {
      flags.tooPerfect = true;
      score += 12;
      suggestions.push('Добавьте разнообразие в пунктуацию — восклицания, многоточия');
    }

    // --- Check: repetitive structure ---
    if (sentences.length >= 3) {
      const lengths = sentences.map((s) => s.trim().length);
      const avgLen = lengths.reduce((a, b) => a + b, 0) / lengths.length;
      const variance =
        lengths.reduce((sum, l) => sum + Math.pow(l - avgLen, 2), 0) / lengths.length;
      if (variance < 100 && sentences.length >= 4) {
        flags.repetitiveStructure = true;
        score += 15;
        suggestions.push('Варьируйте длину предложений — чередуйте короткие и длинные');
      }
    }

    // --- Check: unnatural phrasing ---
    const unnaturalPatterns = [
      /я был бы рад помочь вам/i,
      /чем я могу быть полезен/i,
      /я к вашим услугам/i,
      /позвольте мне помочь/i,
      /я хотел бы предложить/i,
      /вот что я могу сказать/i,
      /как искусственный интеллект/i,
      /как языковая модель/i,
    ];
    const unnaturalMatches = unnaturalPatterns.filter((p) => p.test(text)).length;
    if (unnaturalMatches > 0) {
      flags.unnaturalPhrasing = true;
      score += 20;
      suggestions.push('Уберите шаблонные фразы ИИ, говорите естественнее');
      examples.push('"Я был бы рад помочь" -> просто помогите без предисловий');
    }

    // --- Check: no personality ---
    const hasEmoji = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u.test(text);
    const hasColloquial = COLLOQUIALISMS_RU.some((c) =>
      text.toLowerCase().includes(c),
    );
    const hasExclamation = text.includes('!');
    if (!hasEmoji && !hasColloquial && !hasExclamation && text.length > 80) {
      flags.noPersonality = true;
      score += 10;
      suggestions.push('Добавьте эмодзи, восклицания или разговорные слова');
    }

    // --- Check: no emotional cues ---
    const emotionalWords = [
      'отлично', 'здорово', 'жаль', 'к сожалению', 'рад',
      'понимаю', 'круто', 'ура', 'увы', 'классно',
    ];
    const hasEmotional = emotionalWords.some((w) =>
      text.toLowerCase().includes(w),
    );
    if (!hasEmotional && text.length > 100) {
      flags.noEmotionalCues = true;
      score += 10;
      suggestions.push('Добавьте эмоциональные слова: "отлично", "понимаю", "рад помочь"');
    }

    // --- Check: overexplanation ---
    if (text.length > 500 && sentences.length > 6) {
      flags.overexplanation = true;
      score += 10;
      suggestions.push('Сократите ответ — люди обычно пишут короче');
    }

    // --- Check: list-like responses ---
    const listItemCount = (text.match(/^\s*[-•\d]+[.)]\s/gm) || []).length;
    if (listItemCount >= 3) {
      score += 8;
      suggestions.push('Вместо списков используйте естественный текст');
      examples.push('Списки с пунктами выглядят как ответ бота');
    }

    // Clamp score
    score = Math.min(100, Math.max(0, score));

    return { score, flags, suggestions, examples };
  }

  // ----------------------------------------------------------
  // 7. generateVariations
  // ----------------------------------------------------------

  async generateVariations(text: string, count: number): Promise<string[]> {
    const variations: string[] = [];

    for (let i = 0; i < count; i++) {
      let variant = text;

      // Apply random word substitutions
      for (const [word, alternatives] of Object.entries(WORD_VARIATIONS)) {
        if (variant.toLowerCase().includes(word) && chance(50)) {
          const replacement = randomChoice(alternatives);
          variant = variant.replace(new RegExp(word, 'i'), replacement);
        }
      }

      // Vary punctuation
      if (chance(30)) {
        variant = variant.replace(/\.$/, '!');
      } else if (chance(20)) {
        variant = variant.replace(/\.$/, '...');
      }

      // Optionally add or remove an emoji
      if (chance(25)) {
        const emoji = randomChoice(EMOJI_SETS.neutral);
        variant = variant.trimEnd() + ' ' + emoji;
      }

      // Optionally prepend a filler
      if (chance(20)) {
        const filler = randomChoice(['Ну, ', 'Так вот, ', 'Слушайте, ', 'Кстати, ']);
        variant = filler + variant.charAt(0).toLowerCase() + variant.slice(1);
      }

      // Avoid exact duplicates
      if (!variations.includes(variant) && variant !== text) {
        variations.push(variant);
      } else {
        // If duplicate, try slight punctuation change
        const fallback = variant.trimEnd() + (chance(50) ? '.' : '!');
        if (!variations.includes(fallback)) {
          variations.push(fallback);
        } else {
          variations.push(variant + ' ');
        }
      }
    }

    return variations.slice(0, count);
  }

  // ----------------------------------------------------------
  // 8. setPersonality / getPersonality
  // ----------------------------------------------------------

  setPersonality(personality: PersonalityProfile): void {
    this.personality = personality;
  }

  getPersonality(): PersonalityProfile {
    return this.personality;
  }

  // ============================================================
  // Private helpers
  // ============================================================

  // --- Client style detection ---

  private detectClientStyle(messages: ContextMessage[]): CommunicationStyle {
    const clientMessages = messages.filter((m) => m.role === MessageRole.USER);
    if (clientMessages.length === 0) return CommunicationStyle.PROFESSIONAL;

    let informalScore = 0;
    let formalScore = 0;

    for (const msg of clientMessages) {
      const lower = msg.content.toLowerCase();

      for (const marker of INFORMAL_MARKERS) {
        if (lower.includes(marker)) informalScore++;
      }
      for (const marker of FORMAL_MARKERS) {
        if (lower.includes(marker)) formalScore++;
      }

      // Short messages tend to be informal
      if (msg.content.length < 30) informalScore += 0.5;
      // Messages without punctuation tend to be informal
      if (!msg.content.includes('.') && !msg.content.includes(',')) informalScore += 0.5;
      // Capitalized first word + proper punctuation = formal
      if (/^[A-ZА-ЯЁ]/.test(msg.content) && msg.content.endsWith('.')) formalScore += 0.5;
    }

    if (informalScore > formalScore + 2) return CommunicationStyle.CASUAL;
    if (formalScore > informalScore + 2) return CommunicationStyle.FORMAL;
    if (informalScore > formalScore) return CommunicationStyle.FRIENDLY;
    return CommunicationStyle.PROFESSIONAL;
  }

  private averageMessageLength(messages: ContextMessage[]): number {
    const clientMsgs = messages.filter((m) => m.role === MessageRole.USER);
    if (clientMsgs.length === 0) return 0;
    const total = clientMsgs.reduce((sum, m) => sum + m.content.length, 0);
    return total / clientMsgs.length;
  }

  // --- Text transformation helpers ---

  private makeMoreInformal(text: string): string {
    let result = text;

    // Replace formal phrases with informal equivalents
    for (const [formal, informal] of Object.entries(FORMAL_TO_INFORMAL)) {
      result = result.replace(new RegExp(this.escapeRegex(formal), 'g'), informal);
    }

    // Occasionally drop trailing period for short sentences
    const sentences = result.split(/(?<=[.!?])\s+/);
    if (sentences.length === 1 && result.endsWith('.') && result.length < 80) {
      if (chance(40)) {
        result = result.slice(0, -1);
      }
    }

    return result;
  }

  private ensureProfessional(text: string): string {
    let result = text;

    // Remove overly casual words
    const casualReplacements: Record<string, string> = {
      'ок ': 'хорошо ',
      'норм': 'нормально',
      'спс': 'спасибо',
      'плиз': 'пожалуйста',
      'инфа': 'информация',
    };

    for (const [casual, formal] of Object.entries(casualReplacements)) {
      result = result.replace(new RegExp(`\\b${this.escapeRegex(casual)}\\b`, 'gi'), formal);
    }

    // Ensure proper capitalization at the start
    if (result.length > 0) {
      result = result.charAt(0).toUpperCase() + result.slice(1);
    }

    // Ensure ends with period if no other punctuation
    if (result.length > 0 && !/[.!?]$/.test(result.trim())) {
      result = result.trimEnd() + '.';
    }

    return result;
  }

  private shortenResponse(text: string): string {
    const sentences = text.split(/(?<=[.!?])\s+/);
    if (sentences.length <= 2) return text;

    // Keep only the first 2 sentences (most important info)
    return sentences.slice(0, 2).join(' ');
  }

  private removeFormalStructures(text: string): string {
    let result = text;
    for (const [formal, informal] of Object.entries(FORMAL_TO_INFORMAL)) {
      result = result.replace(new RegExp(this.escapeRegex(formal), 'g'), informal);
    }
    return result;
  }

  private applyContractions(text: string): string {
    // Russian doesn't have contractions like English, but we can shorten phrases
    let result = text;
    const shortenings: Record<string, string> = {
      'для того чтобы': 'чтобы',
      'в том случае если': 'если',
      'по той причине что': 'потому что',
      'в первую очередь': 'прежде всего',
      'в конечном итоге': 'в итоге',
      'в большинстве случаев': 'обычно',
      'на сегодняшний день': 'сейчас',
      'в ближайшее время': 'скоро',
    };

    for (const [long, short] of Object.entries(shortenings)) {
      result = result.replace(new RegExp(this.escapeRegex(long), 'gi'), short);
    }

    return result;
  }

  private insertColloquialism(text: string): string {
    const colloquialism = randomChoice(COLLOQUIALISMS_RU);
    const sentences = text.split(/(?<=[.!?])\s+/);

    if (sentences.length <= 1) {
      // Prepend to single sentence
      return colloquialism.charAt(0).toUpperCase() + colloquialism.slice(1) + ', ' +
        text.charAt(0).toLowerCase() + text.slice(1);
    }

    // Insert before a random sentence (not the first)
    const insertIdx = randomInt(1, sentences.length - 1);
    sentences[insertIdx] =
      colloquialism.charAt(0).toUpperCase() + colloquialism.slice(1) + ', ' +
      sentences[insertIdx].charAt(0).toLowerCase() + sentences[insertIdx].slice(1);

    return sentences.join(' ');
  }

  private varySentenceStructure(text: string): string {
    const sentences = text.split(/(?<=[.!?])\s+/);
    if (sentences.length < 3) return text;

    // Occasionally merge two short sentences with a dash or semicolon
    const result: string[] = [];
    let i = 0;
    while (i < sentences.length) {
      if (
        i < sentences.length - 1 &&
        sentences[i].length < 40 &&
        sentences[i + 1].length < 40 &&
        chance(30)
      ) {
        const merged =
          sentences[i].replace(/[.!?]$/, '') +
          ' — ' +
          sentences[i + 1].charAt(0).toLowerCase() +
          sentences[i + 1].slice(1);
        result.push(merged);
        i += 2;
      } else {
        result.push(sentences[i]);
        i++;
      }
    }

    return result.join(' ');
  }

  private introduceTypo(text: string): string {
    const words = Object.keys(TYPO_MAP);
    for (const word of words) {
      if (text.toLowerCase().includes(word)) {
        // Replace only the first occurrence
        return text.replace(new RegExp(this.escapeRegex(word), 'i'), TYPO_MAP[word]);
      }
    }
    // If no known word to typo, swap two adjacent letters in a long word
    const tokens = text.split(' ');
    const longWords = tokens.filter((t) => t.length >= 6);
    if (longWords.length > 0) {
      const target = randomChoice(longWords);
      const pos = randomInt(1, target.length - 3);
      const typo =
        target.slice(0, pos) + target[pos + 1] + target[pos] + target.slice(pos + 2);
      return text.replace(target, typo);
    }
    return text;
  }

  // --- Personality helpers ---

  private applyEmojiByPersonality(text: string, personality: PersonalityProfile): string {
    const usage = personality.traits.emojiUsage;
    if (usage === EmojiUsage.NONE) return text;

    const preferred = personality.traits.preferredEmojis;
    const freq = personality.traits.emojiFrequency;

    // Probability based on usage level
    let prob: number;
    switch (usage) {
      case EmojiUsage.RARE:
        prob = 15;
        break;
      case EmojiUsage.MODERATE:
        prob = 35;
        break;
      case EmojiUsage.FREQUENT:
        prob = 60;
        break;
      default:
        prob = 0;
    }

    // Scale by frequency factor (0-1)
    prob = prob * Math.min(freq, 1);

    if (!chance(prob)) return text;

    const emojiPool = preferred.length > 0 ? preferred : EMOJI_SETS.neutral;
    const emoji = randomChoice(emojiPool);

    // Append emoji to end of text
    return text.trimEnd() + ' ' + emoji;
  }

  private adjustFormality(text: string, level: FormalityLevel): string {
    switch (level) {
      case FormalityLevel.VERY_CASUAL:
      case FormalityLevel.CASUAL:
        return this.makeMoreInformal(text);
      case FormalityLevel.VERY_FORMAL:
      case FormalityLevel.FORMAL:
        return this.ensureProfessional(text);
      default:
        return text;
    }
  }

  private isGreetingContext(text: string): boolean {
    const greetingPatterns = [
      /^(привет|здравствуй|добрый|доброе|доброго|хай|hello|hi)\b/i,
      /^(приветствую|рад вас видеть)/i,
    ];
    return greetingPatterns.some((p) => p.test(text.trim()));
  }

  private replaceGenericGreeting(text: string, greeting: string): string {
    const genericGreetings = [
      /^привет[!.,]?\s*/i,
      /^здравствуйте[!.,]?\s*/i,
      /^добрый день[!.,]?\s*/i,
      /^доброе утро[!.,]?\s*/i,
      /^добрый вечер[!.,]?\s*/i,
    ];

    for (const pattern of genericGreetings) {
      if (pattern.test(text)) {
        return text.replace(pattern, greeting + ' ');
      }
    }

    return text;
  }

  private isAcknowledgmentContext(text: string): boolean {
    const ackPatterns = [
      /^(понял|понятно|ясно|хорошо|ок|окей|ладно)\b/i,
      /^(принято|учтено|записал)/i,
    ];
    return ackPatterns.some((p) => p.test(text.trim()));
  }

  private insertAcknowledgment(text: string, ack: string): string {
    const genericAcks = [
      /^понял[!.,]?\s*/i,
      /^понятно[!.,]?\s*/i,
      /^хорошо[!.,]?\s*/i,
      /^ок[!.,]?\s*/i,
      /^окей[!.,]?\s*/i,
    ];

    for (const pattern of genericAcks) {
      if (pattern.test(text)) {
        return text.replace(pattern, ack + ' ');
      }
    }

    return ack + ' ' + text;
  }

  private sprinklePreferredPhrase(text: string, phrases: string[]): string {
    const phrase = randomChoice(phrases);
    const sentences = text.split(/(?<=[.!?])\s+/);

    if (sentences.length <= 1) return text;

    // Append preferred phrase at the end of a random sentence
    const idx = randomInt(0, sentences.length - 1);
    sentences[idx] = sentences[idx].replace(/[.!?]$/, '') + ', ' + phrase + '.';

    return sentences.join(' ');
  }

  private insertFiller(text: string, filler: string): string {
    const sentences = text.split(/(?<=[.!?])\s+/);
    if (sentences.length <= 1) {
      return filler.charAt(0).toUpperCase() + filler.slice(1) + ', ' +
        text.charAt(0).toLowerCase() + text.slice(1);
    }

    const idx = randomInt(1, sentences.length - 1);
    sentences[idx] =
      filler.charAt(0).toUpperCase() + filler.slice(1) + ', ' +
      sentences[idx].charAt(0).toLowerCase() + sentences[idx].slice(1);

    return sentences.join(' ');
  }

  // --- Human touch helpers ---

  private addContextualEmoji(text: string): string {
    // Already has emoji? Skip
    if (/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u.test(text)) return text;

    if (!chance(30)) return text;

    const lower = text.toLowerCase();
    let emojiSet: string[];

    if (/отлично|здорово|супер|класс|прекрасно|ура/i.test(lower)) {
      emojiSet = EMOJI_SETS.positive;
    } else if (/жаль|к сожалению|извини|простите|понимаю/i.test(lower)) {
      emojiSet = EMOJI_SETS.empathetic;
    } else {
      emojiSet = EMOJI_SETS.neutral;
    }

    return text.trimEnd() + ' ' + randomChoice(emojiSet);
  }

  // --- Utility ---

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
