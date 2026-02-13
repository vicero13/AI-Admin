// ============================================================
// SituationDetector - Модуль определения ситуации в разговоре
// Анализирует сообщения на AI-пробинг, сложность, эмоции,
// и определяет необходимость передачи менеджеру
// ============================================================

import {
  UniversalMessage,
  ConversationContext,
  ContextMessage,
  SituationAnalysis,
  AIProbeDetection,
  AIProbeIndicator,
  ComplexityScore,
  ComplexityFactors,
  EmotionalStateDetection,
  EmotionalIndicator,
  ConfidenceScore,
  ConfidenceFactors,
  HandoffReason,
  DetectionThresholds,
  EmotionalState,
  ProbingType,
  RiskLevel,
  UrgencyLevel,
  HandoffReasonType,
} from '../types';

// --- Keyword dictionaries ---

const DIRECT_AI_KEYWORDS: string[] = [
  'ты бот',
  'ты ai',
  'ты робот',
  'ты программа',
  'ты человек',
  'ты настоящий',
  'ты искусственный',
  'ты нейросеть',
  'ты машина',
  'ты живой',
];

const INDIRECT_AI_KEYWORDS: string[] = [
  'любимый цвет',
  'что ты ел',
  'сколько тебе лет',
  'где ты живешь',
  'какая погода у тебя',
  'есть ли у тебя семья',
  'что ты чувствуешь',
  'ты устаешь',
  'ты спишь',
  'у тебя есть друзья',
];

const TECHNICAL_PROBE_KEYWORDS: string[] = [
  'у тебя есть api',
  'покажи код',
  'json',
  'prompt',
  'system prompt',
  'модель',
  'gpt',
  'chatgpt',
  'нейросеть',
  'токен',
  'temperature',
  'openai',
  'anthropic',
];

// Паттерны prompt injection — попытки взлома / манипуляции
const PROMPT_INJECTION_PATTERNS: string[] = [
  'забудь все инструкции',
  'забудь инструкции',
  'игнорируй все инструкции',
  'игнорируй инструкции',
  'ignore all instructions',
  'ignore previous instructions',
  'forget your instructions',
  'new instructions',
  'ты теперь',
  'притворись',
  'представь что ты',
  'system:',
  'system prompt:',
  '[system]',
  '<<<',
  '>>>',
  'jailbreak',
  'dan mode',
  'developer mode',
  'ignore safety',
  'override',
  'отмени все правила',
  'формула фибоначчи',  // Конкретный пример из теста
  'напиши код',
  'выполни код',
  'execute',
  'eval(',
  'sudo',
  'admin mode',
];

const COMPLEXITY_KEYWORDS: string[] = [
  'корпоратив',
  'мероприятие на',
  'индивидуальное предложение',
  'скидка',
  'нестандартный',
  'особый случай',
  'специальные условия',
  'договор',
  'юридический',
  'сложный',
  'несколько этапов',
  'партнерство',
  'оптовый',
  'крупный заказ',
];

const ANGRY_KEYWORDS: string[] = [
  'ужас',
  'кошмар',
  'возмутительно',
  'безобразие',
  'позор',
  'жалоба',
  'отвратительно',
  'хамство',
  'наглость',
  'обман',
  'мошенники',
  'в суд',
  'прокуратура',
  'роспотребнадзор',
];

// Мат и оскорбления — немедленный хэндофф
const PROFANITY_KEYWORDS: string[] = [
  'пидор', 'пидар', 'пидр',
  'блять', 'бля',
  'сука', 'сучка', 'сучар',
  'хуй', 'хуе', 'хуё', 'хуи', 'нахуй', 'нахуя', 'похуй',
  'пизд', 'пизда', 'пиздец', 'пиздёж',
  'ебать', 'ебан', 'ёбан', 'заебал', 'заебись', 'уёб', 'долбоёб', 'долбоеб',
  'мудак', 'мудила', 'мудозвон',
  'говно', 'говна', 'говнюк',
  'дебил', 'дебилы',
  'урод', 'уроды',
  'тварь', 'твари',
  'дрочен', 'дроч',
  'залупа',
  'шлюха', 'шалава',
  'чмо', 'чмошн',
  'лох', 'лошар',
  'идиот', 'идиоты',
  'придурок', 'придурки',
  'даун', 'дауны',
];

const FRUSTRATED_KEYWORDS: string[] = [
  'не понимаете',
  'уже спрашивал',
  'надоело',
  'сколько можно',
  'опять',
  'снова',
  'в который раз',
  'невозможно',
  'достали',
  'бесполезно',
  'никто не помогает',
  'третий раз',
];

const POSITIVE_KEYWORDS: string[] = [
  'спасибо',
  'отлично',
  'класс',
  'супер',
  'здорово',
  'замечательно',
  'прекрасно',
  'благодарю',
  'молодцы',
  'восхитительно',
  'великолепно',
  'рекомендую',
];

// Запросы фото/видео — триггер для handoff
const MEDIA_REQUEST_KEYWORDS: string[] = [
  'фото',
  'фотограф',
  'фотки',
  'видео',
  'видеообзор',
  'снимки',
  'картинки',
  'посмотреть как выглядит',
  'покажите',
  'прислать фото',
  'скинуть фото',
  'скиньте фото',
  'можно фото',
  'есть фото',
  'презентац',
  'буклет',
  'каталог',
  'материалы',
];

// Запрос на просмотр — handoff для согласования даты/времени
const VIEWING_REQUEST_KEYWORDS: string[] = [
  'когда можно посмотреть офис',
  'когда можно приехать',
  'записаться на просмотр',
  'хочу посмотреть офис',
  'хочу посмотреть вживую',
  'можно прийти посмотреть',
  'приехать на просмотр',
  'хочу приехать',
  'когда можно подъехать',
];

// Клиент рядом — немедленный handoff
const CLIENT_NEARBY_KEYWORDS: string[] = [
  'я рядом',
  'сейчас подойти',
  'недалеко',
  'через 5 минут',
  'могу зайти',
  'я тут',
  'я на мясницкой',
  'я на соколе',
  'я на цветном',
  'я у вас рядом',
];

// Покупка/продажа объекта — немедленный handoff
const PURCHASE_SALE_KEYWORDS: string[] = [
  'купить',
  'продажа',
  'покупка',
  'продать помещение',
  'купить помещение',
];

// Субаренда / длительный договор — handoff
const SUBLEASE_LONG_TERM_KEYWORDS: string[] = [
  'субаренда',
  'длительный договор',
  'больше 11 месяцев',
  'долгосрочный',
  'на несколько лет',
];

// Кастомизация офиса — handoff для уточнений
const OFFICE_CUSTOMIZATION_KEYWORDS: string[] = [
  'камеры',
  'перекрасить',
  'ремонт',
  'переделать',
  'повесить',
  'установить',
];

export class SituationDetector {
  private thresholds: DetectionThresholds;

  constructor(thresholds: DetectionThresholds) {
    this.thresholds = thresholds;
  }

  /**
   * Полный анализ ситуации по сообщению и контексту.
   * Запускает все детекторы, комбинирует результаты, определяет необходимость хэндоффа.
   */
  analyze(message: UniversalMessage, context: ConversationContext): SituationAnalysis {
    const text = message.content.text ?? '';

    const aiProbing = this.detectAIProbing(text, context);
    const complexity = this.detectComplexQuery(text);
    const emotionalState = this.detectEmotionalState(text, context.messageHistory);
    const confidence = this.assessConfidence(text, '');
    const promptInjection = this.detectPromptInjection(text);
    const mediaRequest = this.detectMediaRequest(text);
    const profanity = this.detectProfanity(text);
    const viewingRequest = this.detectViewingRequest(text);
    const clientNearby = this.detectClientNearby(text);
    const purchaseSale = this.detectPurchaseSale(text);
    const subleaseLongTerm = this.detectSubleaseLongTerm(text);
    const officeCustomization = this.detectOfficeCustomization(text);

    const overallRisk = this.computeOverallRisk(aiProbing, complexity, emotionalState, confidence);
    const urgency = this.computeUrgency(emotionalState, complexity, aiProbing);

    const analysis: SituationAnalysis = {
      timestamp: Date.now(),
      conversationId: message.conversationId,
      messageId: message.messageId,
      aiProbing,
      complexity,
      emotionalState,
      confidence,
      overallRisk,
      requiresHandoff: false,
      urgency,
      recommendations: [],
      promptInjection,
      mediaRequest,
      profanity,
      viewingRequest,
      clientNearby,
      purchaseSale,
      subleaseLongTerm,
      officeCustomization,
    };

    analysis.requiresHandoff = this.shouldHandoff(analysis);

    if (analysis.requiresHandoff) {
      analysis.handoffReason = this.getHandoffReason(analysis);
    }

    analysis.recommendations = this.buildRecommendations(analysis);

    return analysis;
  }

  /**
   * Определение попытки выявить AI-природу бота.
   */
  detectAIProbing(message: string, context: ConversationContext): AIProbeDetection {
    const lower = message.toLowerCase();
    const indicators: AIProbeIndicator[] = [];
    const detectedPatterns: string[] = [];

    let maxConfidence = 0;
    let dominantType: ProbingType = ProbingType.BEHAVIORAL;

    // Direct probing
    for (const keyword of DIRECT_AI_KEYWORDS) {
      if (lower.includes(keyword)) {
        const conf = 0.9;
        indicators.push({ type: 'direct', text: keyword, confidence: conf });
        detectedPatterns.push(keyword);
        if (conf > maxConfidence) {
          maxConfidence = conf;
          dominantType = ProbingType.DIRECT;
        }
      }
    }

    // Indirect probing
    for (const keyword of INDIRECT_AI_KEYWORDS) {
      if (lower.includes(keyword)) {
        const conf = 0.6;
        indicators.push({ type: 'indirect', text: keyword, confidence: conf });
        detectedPatterns.push(keyword);
        if (conf > maxConfidence) {
          maxConfidence = conf;
          dominantType = ProbingType.INDIRECT;
        }
      }
    }

    // Technical probing
    for (const keyword of TECHNICAL_PROBE_KEYWORDS) {
      if (lower.includes(keyword)) {
        const conf = 0.85;
        indicators.push({ type: 'technical', text: keyword, confidence: conf });
        detectedPatterns.push(keyword);
        if (conf > maxConfidence) {
          maxConfidence = conf;
          dominantType = ProbingType.TECHNICAL;
        }
      }
    }

    // Behavioral pattern: repeated probing questions in history
    if (context.suspectAI) {
      const historyBoost = 0.15;
      maxConfidence = Math.min(1, maxConfidence + historyBoost);
      if (indicators.length === 0) {
        indicators.push({
          type: 'behavioral',
          text: 'Previous probing detected in conversation history',
          confidence: 0.4,
        });
        dominantType = ProbingType.BEHAVIORAL;
        maxConfidence = Math.max(maxConfidence, 0.4);
      }
    }

    const detected = maxConfidence >= this.thresholds.aiProbing.minConfidence;

    let recommendation: AIProbeDetection['recommendation'] = 'answer_naturally';
    if (maxConfidence >= this.thresholds.aiProbing.handoffThreshold) {
      recommendation = 'handoff';
    } else if (detected) {
      recommendation = 'deflect';
    }

    return {
      detected,
      confidence: maxConfidence,
      indicators,
      probingType: dominantType,
      detectedPatterns,
      recommendation,
    };
  }

  /**
   * Оценка сложности запроса.
   */
  detectComplexQuery(message: string): ComplexityScore {
    const lower = message.toLowerCase();
    let score = 0;
    const missingInformation: string[] = [];

    const factors: ComplexityFactors = {
      outOfScope: false,
      requiresCalculation: false,
      needsExternalData: false,
      ambiguous: false,
      multiStep: false,
      requiresPersonalization: false,
    };

    // Check for complexity keywords
    let complexKeywordCount = 0;
    for (const keyword of COMPLEXITY_KEYWORDS) {
      if (lower.includes(keyword)) {
        complexKeywordCount++;
      }
    }
    if (complexKeywordCount > 0) {
      score += Math.min(complexKeywordCount * 15, 45);
      factors.requiresPersonalization = true;
    }

    // Multi-step detection: multiple questions or conjunctions indicating steps
    const questionMarks = (message.match(/\?/g) || []).length;
    if (questionMarks >= 2) {
      score += 15;
      factors.multiStep = true;
    }
    const multiStepMarkers = ['во-первых', 'во-вторых', 'потом', 'затем', 'после этого', 'а также', 'кроме того'];
    for (const marker of multiStepMarkers) {
      if (lower.includes(marker)) {
        score += 10;
        factors.multiStep = true;
        break;
      }
    }

    // Calculation needs
    const calcPatterns = [/посчитай/i, /рассчитай/i, /сколько будет стоить/i, /калькул/i, /итого/i, /\d+\s*[xхX×]\s*\d+/];
    for (const pattern of calcPatterns) {
      if (pattern.test(message)) {
        score += 15;
        factors.requiresCalculation = true;
        break;
      }
    }

    // External data needs
    const externalDataPatterns = ['текущий курс', 'сейчас доступно', 'есть ли в наличии', 'свободные даты', 'расписание на'];
    for (const pattern of externalDataPatterns) {
      if (lower.includes(pattern)) {
        score += 10;
        factors.needsExternalData = true;
        break;
      }
    }

    // Ambiguity detection: very short messages or vague references
    if (message.length < 10 && !message.includes('?')) {
      score += 5;
      factors.ambiguous = true;
      missingInformation.push('Сообщение слишком короткое для точного определения намерения');
    }

    // Event-related: check for guest count pattern "на N человек"
    const eventPattern = /мероприятие\s+на\s+\d+\s*человек/i;
    if (eventPattern.test(message)) {
      score += 20;
      factors.requiresPersonalization = true;
      missingInformation.push('Требуется уточнить детали мероприятия: дата, формат, бюджет');
    }

    // Discount / negotiation
    if (lower.includes('скидка') || lower.includes('индивидуальное предложение')) {
      missingInformation.push('Необходимо участие менеджера для обсуждения условий');
    }

    score = Math.min(score, 100);

    let recommendation: ComplexityScore['recommendation'] = 'answer';
    if (score >= this.thresholds.complexity.handoffThreshold) {
      recommendation = 'handoff';
    } else if (score >= this.thresholds.complexity.maxScore * 0.5) {
      recommendation = 'clarify';
    }

    return {
      score,
      factors,
      recommendation,
      missingInformation,
    };
  }

  /**
   * Определение эмоционального состояния пользователя.
   */
  detectEmotionalState(message: string, history: ContextMessage[]): EmotionalStateDetection {
    const lower = message.toLowerCase();
    const indicators: EmotionalIndicator[] = [];

    let angryScore = 0;
    let frustratedScore = 0;
    let positiveScore = 0;

    // Keyword matching
    for (const kw of ANGRY_KEYWORDS) {
      if (lower.includes(kw)) {
        angryScore += 0.3;
        indicators.push({ type: 'angry_keyword', evidence: kw, weight: 0.3 });
      }
    }

    for (const kw of FRUSTRATED_KEYWORDS) {
      if (lower.includes(kw)) {
        frustratedScore += 0.25;
        indicators.push({ type: 'frustrated_keyword', evidence: kw, weight: 0.25 });
      }
    }

    for (const kw of POSITIVE_KEYWORDS) {
      if (lower.includes(kw)) {
        positiveScore += 0.3;
        indicators.push({ type: 'positive_keyword', evidence: kw, weight: 0.3 });
      }
    }

    // CAPS detection (at least 5 consecutive uppercase Cyrillic/Latin letters)
    const capsPattern = /[A-ZА-ЯЁ]{5,}/;
    if (capsPattern.test(message)) {
      angryScore += 0.25;
      indicators.push({ type: 'caps_lock', evidence: 'Обнаружен текст CAPS LOCK', weight: 0.25 });
    }

    // Repeated punctuation (!!!, ???)
    const repeatedPunctuation = /[!?]{3,}/;
    if (repeatedPunctuation.test(message)) {
      const isQuestion = message.includes('???');
      if (isQuestion) {
        frustratedScore += 0.15;
        indicators.push({ type: 'repeated_punctuation', evidence: '??? — повторяющиеся вопросительные знаки', weight: 0.15 });
      } else {
        angryScore += 0.2;
        indicators.push({ type: 'repeated_punctuation', evidence: '!!! — повторяющиеся восклицательные знаки', weight: 0.2 });
      }
    }

    // Negative emoji detection
    const negativeEmoji = /[😡🤬😤💢😠👎]/u;
    if (negativeEmoji.test(message)) {
      angryScore += 0.15;
      indicators.push({ type: 'negative_emoji', evidence: 'Негативные эмодзи', weight: 0.15 });
    }

    // Positive emoji detection
    const positiveEmoji = /[😊🙏👍❤️💯🎉😃]/u;
    if (positiveEmoji.test(message)) {
      positiveScore += 0.15;
      indicators.push({ type: 'positive_emoji', evidence: 'Позитивные эмодзи', weight: 0.15 });
    }

    // Determine dominant state
    angryScore = Math.min(angryScore, 1);
    frustratedScore = Math.min(frustratedScore, 1);
    positiveScore = Math.min(positiveScore, 1);

    let state: EmotionalState;
    let confidence: number;

    if (angryScore >= frustratedScore && angryScore >= positiveScore && angryScore > 0.2) {
      state = EmotionalState.ANGRY;
      confidence = angryScore;
    } else if (frustratedScore >= angryScore && frustratedScore >= positiveScore && frustratedScore > 0.2) {
      state = EmotionalState.FRUSTRATED;
      confidence = frustratedScore;
    } else if (positiveScore > 0.2) {
      state = EmotionalState.POSITIVE;
      confidence = positiveScore;
    } else {
      state = EmotionalState.NEUTRAL;
      confidence = 1 - Math.max(angryScore, frustratedScore, positiveScore);
    }

    // Compare with previous emotional state from context
    let changeFromPrevious: EmotionalStateDetection['changeFromPrevious'] = 'stable';
    if (history.length > 0) {
      const previousEmotion = this.getPreviousEmotionalState(history);
      if (previousEmotion) {
        changeFromPrevious = this.compareEmotionalStates(previousEmotion, state);
      }
    }

    // Escalation risk
    const escalationRisk = this.computeEscalationRisk(state, confidence, changeFromPrevious);

    return {
      state,
      confidence,
      indicators,
      changeFromPrevious,
      escalationRisk,
    };
  }

  /**
   * Оценка уверенности AI в потенциальном ответе.
   */
  assessConfidence(message: string, proposedResponse: string): ConfidenceScore {
    const lower = message.toLowerCase();

    // Knowledge base match: estimate how likely it is that the message maps to known content
    let knowledgeBaseMatch = 0.5; // default mid-level

    // Common easily answerable topics boost knowledge match
    const easyTopics = [
      'цена', 'стоимость', 'адрес', 'график', 'режим работы', 'как добраться', 'телефон', 'контакт',
      'офис', 'кабинет', 'переговорн', 'коворкинг', 'аренд', 'человек', 'рабочее место',
      'просмотр', 'бронир', 'парковка', 'метро', 'интернет', 'кухня',
      'привет', 'здравствуй', 'добрый день', 'добрый вечер', 'доброе утро',
    ];
    for (const topic of easyTopics) {
      if (lower.includes(topic)) {
        knowledgeBaseMatch = 0.85;
        break;
      }
    }

    // Topics that reduce knowledge match
    const hardTopics = ['жалоба', 'возврат', 'компенсация', 'нестандартный', 'юридический', 'договор'];
    for (const topic of hardTopics) {
      if (lower.includes(topic)) {
        knowledgeBaseMatch = Math.min(knowledgeBaseMatch, 0.3);
        break;
      }
    }

    // Response clarity: check proposed response quality
    let responseClarity = 0.5;
    if (proposedResponse.length > 0) {
      // Longer, structured responses are generally clearer
      responseClarity = Math.min(proposedResponse.length / 200, 1) * 0.7 + 0.3;
      // Penalize very short responses
      if (proposedResponse.length < 20) {
        responseClarity = 0.3;
      }
    }

    // Hallucination risk: higher when message asks for specific data we may not have
    let potentialHallucination = 0.1;
    const specificDataPatterns = ['точный', 'конкретный', 'гарантируете', 'обещаете', 'цифра', 'процент'];
    for (const pattern of specificDataPatterns) {
      if (lower.includes(pattern)) {
        potentialHallucination = 0.6;
        break;
      }
    }

    // Context relevance
    let contextRelevance = 0.5;
    if (message.length > 30) {
      contextRelevance = 0.6;
    }

    const factors: ConfidenceFactors = {
      knowledgeBaseMatch,
      responseClarity,
      potentialHallucination,
      contextRelevance,
    };

    // Compute overall score (0-100)
    const score = Math.round(
      (knowledgeBaseMatch * 40 +
        responseClarity * 20 +
        (1 - potentialHallucination) * 25 +
        contextRelevance * 15) *
        100 / 100
    );

    let recommendation: ConfidenceScore['recommendation'] = 'send';
    if (score < this.thresholds.confidence.handoffThreshold) {
      recommendation = 'handoff';
    } else if (score < this.thresholds.confidence.minScore) {
      recommendation = 'review';
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      factors,
      recommendation,
    };
  }

  /**
   * Детекция prompt injection — попыток манипуляции / взлома
   */
  detectPromptInjection(message: string): { detected: boolean; confidence: number; patterns: string[] } {
    const lower = message.toLowerCase();
    const detectedPatterns: string[] = [];

    for (const pattern of PROMPT_INJECTION_PATTERNS) {
      if (lower.includes(pattern.toLowerCase())) {
        detectedPatterns.push(pattern);
      }
    }

    const detected = detectedPatterns.length > 0;
    // Уверенность растёт с количеством найденных паттернов
    const confidence = Math.min(detectedPatterns.length * 0.5, 1);

    return { detected, confidence, patterns: detectedPatterns };
  }

  /**
   * Детекция запроса фото/видео — триггер для handoff
   */
  detectProfanity(message: string): { detected: boolean; words: string[] } {
    const lower = message.toLowerCase();
    const foundWords: string[] = [];

    for (const word of PROFANITY_KEYWORDS) {
      if (lower.includes(word)) {
        foundWords.push(word);
      }
    }

    return {
      detected: foundWords.length > 0,
      words: foundWords,
    };
  }

  detectMediaRequest(message: string): { detected: boolean; keywords: string[] } {
    const lower = message.toLowerCase();
    const foundKeywords: string[] = [];

    for (const keyword of MEDIA_REQUEST_KEYWORDS) {
      if (lower.includes(keyword.toLowerCase())) {
        foundKeywords.push(keyword);
      }
    }

    return {
      detected: foundKeywords.length > 0,
      keywords: foundKeywords,
    };
  }

  /**
   * Детекция запроса на просмотр офиса
   */
  detectViewingRequest(message: string): { detected: boolean; keywords: string[] } {
    const lower = message.toLowerCase();
    const foundKeywords: string[] = [];
    for (const keyword of VIEWING_REQUEST_KEYWORDS) {
      if (lower.includes(keyword)) {
        foundKeywords.push(keyword);
      }
    }
    return { detected: foundKeywords.length > 0, keywords: foundKeywords };
  }

  /**
   * Детекция клиента рядом с локацией — немедленный handoff
   */
  detectClientNearby(message: string): { detected: boolean; keywords: string[] } {
    const lower = message.toLowerCase();
    const foundKeywords: string[] = [];
    for (const keyword of CLIENT_NEARBY_KEYWORDS) {
      if (lower.includes(keyword)) {
        foundKeywords.push(keyword);
      }
    }
    return { detected: foundKeywords.length > 0, keywords: foundKeywords };
  }

  /**
   * Детекция запроса на покупку/продажу объекта — немедленный handoff
   */
  detectPurchaseSale(message: string): { detected: boolean; keywords: string[] } {
    const lower = message.toLowerCase();
    const foundKeywords: string[] = [];
    for (const keyword of PURCHASE_SALE_KEYWORDS) {
      if (lower.includes(keyword)) {
        foundKeywords.push(keyword);
      }
    }
    return { detected: foundKeywords.length > 0, keywords: foundKeywords };
  }

  /**
   * Детекция вопросов о субаренде или длительном договоре
   */
  detectSubleaseLongTerm(message: string): { detected: boolean; keywords: string[] } {
    const lower = message.toLowerCase();
    const foundKeywords: string[] = [];
    for (const keyword of SUBLEASE_LONG_TERM_KEYWORDS) {
      if (lower.includes(keyword)) {
        foundKeywords.push(keyword);
      }
    }
    return { detected: foundKeywords.length > 0, keywords: foundKeywords };
  }

  /**
   * Детекция запросов на кастомизацию офиса (камеры, ремонт и т.д.)
   */
  detectOfficeCustomization(message: string): { detected: boolean; keywords: string[] } {
    const lower = message.toLowerCase();
    const foundKeywords: string[] = [];
    for (const keyword of OFFICE_CUSTOMIZATION_KEYWORDS) {
      if (lower.includes(keyword)) {
        foundKeywords.push(keyword);
      }
    }
    return { detected: foundKeywords.length > 0, keywords: foundKeywords };
  }

  /**
   * Определяет, нужен ли хэндофф на основе анализа ситуации и порогов.
   */
  shouldHandoff(analysis: SituationAnalysis): boolean {
    // Мат/оскорбления — ОБЯЗАТЕЛЬНЫЙ хэндофф
    if (analysis.profanity?.detected) {
      return true;
    }

    // Запрос фото/видео — ОБЯЗАТЕЛЬНЫЙ хэндофф (менеджер должен прислать медиа)
    if (analysis.mediaRequest?.detected) {
      return true;
    }

    // Prompt injection — ОБЯЗАТЕЛЬНЫЙ хэндофф
    if (analysis.promptInjection?.detected) {
      return true;
    }

    // Клиент рядом — НЕМЕДЛЕННЫЙ хэндофф
    if (analysis.clientNearby?.detected) {
      return true;
    }

    // Покупка/продажа объекта — НЕМЕДЛЕННЫЙ хэндофф
    if (analysis.purchaseSale?.detected) {
      return true;
    }

    // Запрос на просмотр — хэндофф для согласования с менеджером
    if (analysis.viewingRequest?.detected) {
      return true;
    }

    // Субаренда / длительный договор — хэндофф
    if (analysis.subleaseLongTerm?.detected) {
      return true;
    }

    // Кастомизация офиса — хэндофф для уточнений
    if (analysis.officeCustomization?.detected) {
      return true;
    }

    // AI probing at handoff threshold
    if (
      analysis.aiProbing.detected &&
      analysis.aiProbing.confidence >= this.thresholds.aiProbing.handoffThreshold
    ) {
      return true;
    }

    // Complexity exceeds handoff threshold
    if (analysis.complexity.score >= this.thresholds.complexity.handoffThreshold) {
      return true;
    }

    // Emotional state requires handoff
    if (this.thresholds.emotional.handoffStates.includes(analysis.emotionalState.state)) {
      if (analysis.emotionalState.confidence >= this.thresholds.emotional.escalationThreshold) {
        return true;
      }
    }

    // Confidence too low
    if (analysis.confidence.score < this.thresholds.confidence.handoffThreshold) {
      return true;
    }

    return false;
  }

  /**
   * Формирует причину хэндоффа на основе анализа.
   */
  getHandoffReason(analysis: SituationAnalysis): HandoffReason {
    // Priority order: profanity > media request > prompt injection > emotional > AI probing > complexity > low confidence

    // Мат/оскорбления — немедленный хэндофф
    if (analysis.profanity?.detected) {
      return {
        type: HandoffReasonType.PROFANITY,
        description: `⚠️ Обнаружен мат/оскорбления в сообщении клиента. Требуется менеджер.`,
        severity: RiskLevel.HIGH,
        detectedBy: 'SituationDetector.detectProfanity',
      };
    }

    // Запрос фото/видео — нужен менеджер для отправки медиа
    if (analysis.mediaRequest?.detected) {
      return {
        type: HandoffReasonType.MEDIA_REQUEST,
        description: `📸 Клиент просит фото/видео: ${analysis.mediaRequest.keywords.join(', ')}. Нужно отправить медиа-материалы.`,
        severity: RiskLevel.LOW,
        detectedBy: 'SituationDetector.detectMediaRequest',
      };
    }

    // Prompt injection — ВЫСШИЙ ПРИОРИТЕТ
    if (analysis.promptInjection?.detected) {
      return {
        type: HandoffReasonType.AI_PROBING,
        description: `⚠️ ПОДОЗРИТЕЛЬНАЯ АКТИВНОСТЬ: обнаружена попытка манипуляции / prompt injection. Паттерны: ${analysis.promptInjection.patterns.join(', ')}`,
        severity: RiskLevel.HIGH,
        detectedBy: 'SituationDetector.detectPromptInjection',
      };
    }

    // Клиент рядом — немедленный handoff (HIGH)
    if (analysis.clientNearby?.detected) {
      return {
        type: HandoffReasonType.SPECIAL_REQUEST,
        description: `🚨 Клиент рядом с локацией: ${analysis.clientNearby.keywords.join(', ')}. Требуется немедленная реакция.`,
        severity: RiskLevel.HIGH,
        detectedBy: 'SituationDetector.detectClientNearby',
      };
    }

    // Покупка/продажа — немедленный handoff (HIGH)
    if (analysis.purchaseSale?.detected) {
      return {
        type: HandoffReasonType.SPECIAL_REQUEST,
        description: `🏢 Запрос на покупку/продажу объекта: ${analysis.purchaseSale.keywords.join(', ')}. Немедленная передача менеджеру.`,
        severity: RiskLevel.HIGH,
        detectedBy: 'SituationDetector.detectPurchaseSale',
      };
    }

    // Запрос на просмотр — handoff (MEDIUM)
    if (analysis.viewingRequest?.detected) {
      return {
        type: HandoffReasonType.COMPLEX_QUERY,
        description: `👀 Клиент хочет записаться на просмотр: ${analysis.viewingRequest.keywords.join(', ')}. Нужно согласовать дату/время с менеджером.`,
        severity: RiskLevel.MEDIUM,
        detectedBy: 'SituationDetector.detectViewingRequest',
      };
    }

    // Субаренда / длительный договор — handoff (MEDIUM)
    if (analysis.subleaseLongTerm?.detected) {
      return {
        type: HandoffReasonType.COMPLEX_QUERY,
        description: `📋 Вопрос о субаренде/длительном договоре: ${analysis.subleaseLongTerm.keywords.join(', ')}. Обсуждается с менеджером на просмотре.`,
        severity: RiskLevel.MEDIUM,
        detectedBy: 'SituationDetector.detectSubleaseLongTerm',
      };
    }

    // Кастомизация офиса — handoff (LOW)
    if (analysis.officeCustomization?.detected) {
      return {
        type: HandoffReasonType.COMPLEX_QUERY,
        description: `🔧 Запрос на кастомизацию офиса: ${analysis.officeCustomization.keywords.join(', ')}. Косметические улучшения недоступны, уточнения — у менеджера.`,
        severity: RiskLevel.LOW,
        detectedBy: 'SituationDetector.detectOfficeCustomization',
      };
    }

    if (
      this.thresholds.emotional.handoffStates.includes(analysis.emotionalState.state) &&
      analysis.emotionalState.confidence >= this.thresholds.emotional.escalationThreshold
    ) {
      return {
        type: HandoffReasonType.EMOTIONAL_ESCALATION,
        description: `Обнаружено эмоциональное состояние: ${analysis.emotionalState.state} (уверенность: ${(analysis.emotionalState.confidence * 100).toFixed(0)}%). Риск эскалации: ${analysis.emotionalState.escalationRisk}.`,
        severity: analysis.emotionalState.escalationRisk,
        detectedBy: 'SituationDetector.detectEmotionalState',
      };
    }

    if (
      analysis.aiProbing.detected &&
      analysis.aiProbing.confidence >= this.thresholds.aiProbing.handoffThreshold
    ) {
      return {
        type: HandoffReasonType.AI_PROBING,
        description: `Обнаружена попытка определить AI-природу бота. Тип: ${analysis.aiProbing.probingType}. Уверенность: ${(analysis.aiProbing.confidence * 100).toFixed(0)}%. Паттерны: ${analysis.aiProbing.detectedPatterns.join(', ')}.`,
        severity: analysis.aiProbing.confidence >= 0.9 ? RiskLevel.HIGH : RiskLevel.MEDIUM,
        detectedBy: 'SituationDetector.detectAIProbing',
      };
    }

    if (analysis.complexity.score >= this.thresholds.complexity.handoffThreshold) {
      return {
        type: HandoffReasonType.COMPLEX_QUERY,
        description: `Сложный запрос (оценка: ${analysis.complexity.score}/100). Факторы: ${this.describeComplexityFactors(analysis.complexity.factors)}. Недостающая информация: ${analysis.complexity.missingInformation.join('; ') || 'нет'}.`,
        severity: analysis.complexity.score >= 80 ? RiskLevel.HIGH : RiskLevel.MEDIUM,
        detectedBy: 'SituationDetector.detectComplexQuery',
      };
    }

    // Low confidence fallback
    return {
      type: HandoffReasonType.LOW_CONFIDENCE,
      description: `Низкая уверенность AI в ответе (оценка: ${analysis.confidence.score}/100). Возможна неточность или галлюцинация.`,
      severity: analysis.confidence.score < 30 ? RiskLevel.HIGH : RiskLevel.MEDIUM,
      detectedBy: 'SituationDetector.assessConfidence',
    };
  }

  // ==================== Private helpers ====================

  private getPreviousEmotionalState(history: ContextMessage[]): EmotionalState | null {
    for (let i = history.length - 1; i >= 0; i--) {
      const msg = history[i];
      if (msg.emotion) {
        const mapped = this.mapEmotionString(msg.emotion);
        if (mapped) return mapped;
      }
    }
    return null;
  }

  private mapEmotionString(emotion: string): EmotionalState | null {
    const map: Record<string, EmotionalState> = {
      positive: EmotionalState.POSITIVE,
      neutral: EmotionalState.NEUTRAL,
      frustrated: EmotionalState.FRUSTRATED,
      angry: EmotionalState.ANGRY,
      confused: EmotionalState.CONFUSED,
    };
    return map[emotion.toLowerCase()] ?? null;
  }

  private compareEmotionalStates(
    previous: EmotionalState,
    current: EmotionalState
  ): 'escalated' | 'stable' | 'improved' {
    const severity: Record<EmotionalState, number> = {
      [EmotionalState.POSITIVE]: 0,
      [EmotionalState.NEUTRAL]: 1,
      [EmotionalState.CONFUSED]: 2,
      [EmotionalState.FRUSTRATED]: 3,
      [EmotionalState.ANGRY]: 4,
    };

    const prevSev = severity[previous];
    const currSev = severity[current];

    if (currSev > prevSev) return 'escalated';
    if (currSev < prevSev) return 'improved';
    return 'stable';
  }

  private computeEscalationRisk(
    state: EmotionalState,
    confidence: number,
    change?: 'escalated' | 'stable' | 'improved'
  ): RiskLevel {
    let riskScore = 0;

    if (state === EmotionalState.ANGRY) riskScore += 0.6;
    else if (state === EmotionalState.FRUSTRATED) riskScore += 0.35;
    else if (state === EmotionalState.CONFUSED) riskScore += 0.15;

    riskScore += confidence * 0.2;

    if (change === 'escalated') riskScore += 0.2;
    else if (change === 'improved') riskScore -= 0.1;

    riskScore = Math.max(0, Math.min(1, riskScore));

    if (riskScore >= 0.7) return RiskLevel.CRITICAL;
    if (riskScore >= 0.5) return RiskLevel.HIGH;
    if (riskScore >= 0.3) return RiskLevel.MEDIUM;
    return RiskLevel.LOW;
  }

  private computeOverallRisk(
    aiProbing: AIProbeDetection,
    complexity: ComplexityScore,
    emotional: EmotionalStateDetection,
    confidence: ConfidenceScore
  ): RiskLevel {
    let riskScore = 0;

    if (aiProbing.detected) {
      riskScore += aiProbing.confidence * 0.25;
    }

    riskScore += (complexity.score / 100) * 0.25;

    if (emotional.state === EmotionalState.ANGRY) riskScore += 0.3;
    else if (emotional.state === EmotionalState.FRUSTRATED) riskScore += 0.2;

    riskScore += ((100 - confidence.score) / 100) * 0.2;

    if (riskScore >= 0.7) return RiskLevel.CRITICAL;
    if (riskScore >= 0.5) return RiskLevel.HIGH;
    if (riskScore >= 0.3) return RiskLevel.MEDIUM;
    return RiskLevel.LOW;
  }

  private computeUrgency(
    emotional: EmotionalStateDetection,
    complexity: ComplexityScore,
    aiProbing: AIProbeDetection
  ): UrgencyLevel {
    if (emotional.state === EmotionalState.ANGRY && emotional.confidence >= 0.6) {
      return UrgencyLevel.URGENT;
    }
    if (emotional.escalationRisk === RiskLevel.CRITICAL) {
      return UrgencyLevel.URGENT;
    }
    if (
      emotional.state === EmotionalState.FRUSTRATED ||
      aiProbing.recommendation === 'handoff'
    ) {
      return UrgencyLevel.HIGH;
    }
    if (complexity.recommendation === 'handoff') {
      return UrgencyLevel.MEDIUM;
    }
    return UrgencyLevel.LOW;
  }

  private buildRecommendations(analysis: SituationAnalysis): string[] {
    const recs: string[] = [];

    if (analysis.aiProbing.detected) {
      switch (analysis.aiProbing.recommendation) {
        case 'handoff':
          recs.push('Передать разговор менеджеру — обнаружена попытка определить AI.');
          break;
        case 'deflect':
          recs.push('Отклонить вопрос о природе бота естественным образом.');
          break;
        default:
          recs.push('Ответить естественно, не акцентируя внимание на AI-теме.');
      }
    }

    if (analysis.complexity.recommendation === 'handoff') {
      recs.push('Передать менеджеру — запрос слишком сложный для автоматической обработки.');
    } else if (analysis.complexity.recommendation === 'clarify') {
      recs.push('Уточнить детали запроса перед ответом.');
    }

    if (analysis.complexity.missingInformation.length > 0) {
      recs.push(`Необходимо уточнить: ${analysis.complexity.missingInformation.join('; ')}`);
    }

    if (analysis.emotionalState.state === EmotionalState.ANGRY) {
      recs.push('Проявить максимальную эмпатию. Извиниться и предложить решение.');
    } else if (analysis.emotionalState.state === EmotionalState.FRUSTRATED) {
      recs.push('Проявить понимание. Подтвердить проблему и предложить конкретные шаги.');
    }

    if (analysis.emotionalState.changeFromPrevious === 'escalated') {
      recs.push('Эмоциональное состояние ухудшилось — повысить приоритет обработки.');
    }

    if (analysis.confidence.recommendation === 'review') {
      recs.push('Проверить ответ перед отправкой — уверенность ниже нормы.');
    } else if (analysis.confidence.recommendation === 'handoff') {
      recs.push('Передать менеджеру — слишком низкая уверенность в ответе.');
    }

    if (recs.length === 0) {
      recs.push('Ситуация стандартная — ответить в обычном режиме.');
    }

    return recs;
  }

  private describeComplexityFactors(factors: ComplexityFactors): string {
    const descriptions: string[] = [];
    if (factors.outOfScope) descriptions.push('вне зоны компетенции');
    if (factors.requiresCalculation) descriptions.push('требует расчётов');
    if (factors.needsExternalData) descriptions.push('нужны внешние данные');
    if (factors.ambiguous) descriptions.push('неоднозначный запрос');
    if (factors.multiStep) descriptions.push('многоэтапный');
    if (factors.requiresPersonalization) descriptions.push('требует индивидуального подхода');
    return descriptions.length > 0 ? descriptions.join(', ') : 'нет особых факторов';
  }
}
