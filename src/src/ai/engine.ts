import {
  AIEngineConfig,
  AIRequest,
  AIResponse,
  AIResponseMetadata,
  AIProvider,
  ConversationContext,
  KnowledgeItem,
  PersonalityProfile,
  HumanLikeResponse,
  HandoffReason,
  HandoffReasonType,
  RiskLevel,
  KnowledgeType,
  MessageRole,
  EmotionalState,
  CommunicationStyle,
  EmojiUsage,
} from '../types';
import { AnthropicProvider } from './providers/anthropic';

export class AIEngine {
  private config: AIEngineConfig;
  private provider: AnthropicProvider | null = null;
  private initialized = false;

  constructor(config: AIEngineConfig) {
    this.config = config;
  }

  initialize(): void {
    if (this.config.provider === AIProvider.ANTHROPIC) {
      const apiKey = (this.config.metadata?.apiKey as string) ?? '';
      this.provider = new AnthropicProvider({
        apiKey,
        model: this.config.model,
        maxTokens: this.config.maxTokens,
        temperature: this.config.temperature,
        topP: this.config.topP,
      });
    } else {
      throw new Error(`Provider "${this.config.provider}" is not supported. Currently only "anthropic" is available.`);
    }
    this.initialized = true;
  }

  async generateResponse(request: AIRequest): Promise<AIResponse> {
    this.ensureInitialized();

    const startTime = Date.now();

    const knowledgeContext = this.buildKnowledgeContext(request.relevantKnowledge);

    const systemPrompt =
      request.systemPrompt ??
      this.buildSystemPrompt(
        request.personality,
        knowledgeContext,
        request.additionalInstructions
      );

    const messages = request.context.messageHistory.map((msg) => ({
      role: msg.role === MessageRole.USER ? 'user' : 'assistant',
      content: msg.content,
    }));

    // Ensure the latest user message is included
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.role !== 'user' || lastMsg.content !== request.message) {
      messages.push({ role: 'user', content: request.message });
    }

    try {
      const providerResponse = await this.provider!.generateResponse(
        systemPrompt,
        messages,
        {
          temperature: request.parameters?.temperature ?? this.config.temperature,
          maxTokens: request.parameters?.maxTokens ?? this.config.maxTokens,
          topP: request.parameters?.topP ?? this.config.topP,
        }
      );

      const latency = Date.now() - startTime;

      const metadata: AIResponseMetadata = {
        provider: this.config.provider,
        model: this.config.model,
        tokensUsed: providerResponse.tokensUsed,
        latency,
        finishReason: providerResponse.finishReason as 'stop' | 'length' | 'error',
        cached: false,
        timestamp: Date.now(),
      };

      return {
        text: providerResponse.text,
        metadata,
      };
    } catch (error: unknown) {
      const latency = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      return {
        text: '',
        metadata: {
          provider: this.config.provider,
          model: this.config.model,
          tokensUsed: 0,
          latency,
          finishReason: 'error',
          cached: false,
          timestamp: Date.now(),
        },
        analysis: {
          containsQuestion: false,
          containsInstruction: false,
          emotionalTone: 'neutral',
          possibleHallucination: false,
          offTopic: false,
          tooRobotic: false,
          needsImprovement: true,
          suggestions: [`Error generating response: ${errorMessage}`],
        },
      };
    }
  }

  async generateHumanLikeResponse(
    message: string,
    context: ConversationContext,
    knowledgeItems: KnowledgeItem[],
    personality: PersonalityProfile
  ): Promise<HumanLikeResponse> {
    this.ensureInitialized();

    const startTime = Date.now();

    const knowledgeContext = this.buildKnowledgeContext(knowledgeItems);
    const faqContext = this.buildFAQContext(knowledgeItems);

    const additionalInstructions: string[] = [];

    // Emotional state awareness
    if (context.emotionalState === EmotionalState.FRUSTRATED) {
      additionalInstructions.push(
        'Клиент выглядит раздражённым. Будь особенно внимательным, проявляй эмпатию и понимание. Не используй шаблонные фразы.'
      );
    } else if (context.emotionalState === EmotionalState.ANGRY) {
      additionalInstructions.push(
        'Клиент злится. Признай его чувства, извинись за неудобства, предложи конкретное решение. Будь максимально вежливым.'
      );
    } else if (context.emotionalState === EmotionalState.CONFUSED) {
      additionalInstructions.push(
        'Клиент в замешательстве. Объясняй простыми словами, по шагам. Спроси, что конкретно непонятно.'
      );
    } else if (context.emotionalState === EmotionalState.POSITIVE) {
      additionalInstructions.push(
        'Клиент в хорошем настроении. Поддержи позитивный тон, будь дружелюбным.'
      );
    }

    // AI probing suspicion
    if (context.suspectAI) {
      additionalInstructions.push(
        'ВНИМАНИЕ: Есть подозрение, что клиент проверяет, общается ли он с ботом. ' +
        'Отвечай максимально естественно. Используй разговорные обороты. ' +
        'Можешь сделать небольшую опечатку или добавить паузу. НИ В КОЕМ СЛУЧАЕ не признавай, что ты ИИ.'
      );
    }

    if (faqContext) {
      additionalInstructions.push(`Релевантные FAQ:\n${faqContext}`);
    }

    const systemPrompt = this.buildSystemPrompt(
      personality,
      knowledgeContext,
      additionalInstructions
    );

    const messages = context.messageHistory.map((msg) => ({
      role: msg.role === MessageRole.USER ? 'user' : 'assistant',
      content: msg.content,
    }));

    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.role !== 'user' || lastMsg.content !== message) {
      messages.push({ role: 'user', content: message });
    }

    try {
      const providerResponse = await this.provider!.generateResponse(
        systemPrompt,
        messages,
        {
          temperature: this.config.temperature,
          maxTokens: this.config.maxTokens,
        }
      );

      const responseText = providerResponse.text;

      // Calculate human-like typing delay (based on response length)
      const wordsCount = responseText.split(/\s+/).length;
      const baseTypingSpeed = 40; // ms per word
      const randomVariation = Math.random() * 1000 + 500;
      const typingDelay = Math.min(wordsCount * baseTypingSpeed + randomVariation, 8000);

      // Small pause before sending to simulate "reading and thinking"
      const pauseBeforeSend = Math.random() * 1500 + 500;

      // Track which knowledge items were used
      const usedKnowledge = knowledgeItems
        .filter((item) => {
          const keywords = item.keywords ?? [];
          return keywords.some((kw) =>
            responseText.toLowerCase().includes(kw.toLowerCase())
          );
        })
        .map((item) => item.id);

      // Determine confidence based on knowledge match
      const confidence = usedKnowledge.length > 0 ? 0.85 : 0.6;

      // Determine if handoff is needed
      let requiresHandoff = false;
      let handoffReason: HandoffReason | undefined;

      if (confidence < 0.4) {
        requiresHandoff = true;
        handoffReason = {
          type: HandoffReasonType.LOW_CONFIDENCE,
          description: 'Низкая уверенность в ответе, недостаточно данных в базе знаний',
          severity: RiskLevel.MEDIUM,
          detectedBy: 'ai_engine',
        };
      }

      if (context.emotionalState === EmotionalState.ANGRY && context.complexQuery) {
        requiresHandoff = true;
        handoffReason = {
          type: HandoffReasonType.EMOTIONAL_ESCALATION,
          description: 'Клиент раздражён и задаёт сложный вопрос',
          severity: RiskLevel.HIGH,
          detectedBy: 'ai_engine',
        };
      }

      return {
        text: responseText,
        confidence,
        requiresHandoff,
        handoffReason,
        typingDelay: Math.round(typingDelay),
        pauseBeforeSend: Math.round(pauseBeforeSend),
        usedKnowledge,
        suggestedFollowUp: [],
        metadata: {
          latency: Date.now() - startTime,
          tokensUsed: providerResponse.tokensUsed,
          emotionalState: context.emotionalState,
        },
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        text: 'Секундочку, уточню информацию и вернусь к вам.',
        confidence: 0,
        requiresHandoff: true,
        handoffReason: {
          type: HandoffReasonType.TECHNICAL_ISSUE,
          description: `Ошибка AI-движка: ${errorMessage}`,
          severity: RiskLevel.HIGH,
          detectedBy: 'ai_engine',
        },
        typingDelay: 1500,
        pauseBeforeSend: 500,
        usedKnowledge: [],
        metadata: { error: errorMessage },
      };
    }
  }

  async analyzeIntent(
    message: string,
    context: ConversationContext
  ): Promise<{
    primaryIntent: string;
    confidence: number;
    entities: Array<{ type: string; value: string }>;
  }> {
    this.ensureInitialized();

    const systemPrompt = `Ты — анализатор намерений пользователя. Проанализируй сообщение клиента и верни JSON-объект со следующими полями:
- primaryIntent: строка, основное намерение (например: "booking", "pricing_inquiry", "complaint", "greeting", "farewell", "general_question", "service_inquiry", "location_inquiry", "schedule_inquiry", "feedback", "ai_probing", "unknown")
- confidence: число от 0 до 1, уверенность в определении намерения
- entities: массив объектов {type, value} — выделенные сущности (дата, время, услуга, имя и т.д.)

Учитывай контекст диалога. Отвечай ТОЛЬКО валидным JSON, без пояснений.`;

    const recentMessages = context.messageHistory.slice(-5).map((msg) => ({
      role: msg.role === MessageRole.USER ? 'user' : 'assistant',
      content: msg.content,
    }));

    recentMessages.push({ role: 'user', content: message });

    try {
      const providerResponse = await this.provider!.generateResponse(
        systemPrompt,
        recentMessages,
        { temperature: 0.1, maxTokens: 512 }
      );

      const parsed = JSON.parse(providerResponse.text);
      return {
        primaryIntent: parsed.primaryIntent ?? 'unknown',
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
        entities: Array.isArray(parsed.entities) ? parsed.entities : [],
      };
    } catch {
      return {
        primaryIntent: 'unknown',
        confidence: 0,
        entities: [],
      };
    }
  }

  async validateResponse(
    response: string,
    context: ConversationContext
  ): Promise<{
    valid: boolean;
    issues: Array<{ type: string; severity: string; description: string }>;
    qualityScore: number;
  }> {
    this.ensureInitialized();

    const systemPrompt = `Ты — модуль проверки качества ответов AI-администратора. Проанализируй предложенный ответ и верни JSON со следующими полями:
- valid: boolean — можно ли отправить этот ответ клиенту
- issues: массив объектов {type, severity, description} — найденные проблемы
  - type: "robotic_tone" | "hallucination" | "off_topic" | "too_long" | "too_short" | "inappropriate" | "reveals_ai" | "grammar" | "missing_info"
  - severity: "low" | "medium" | "high" | "critical"
  - description: описание проблемы
- qualityScore: число от 0 до 1 — общая оценка качества ответа

Критерии проверки:
1. Ответ не должен выдавать, что это ИИ (слова "нейросеть", "модель", "ИИ", "AI", "я не живой человек" и т.д.)
2. Ответ должен звучать естественно, как от живого человека
3. Ответ должен быть по теме диалога
4. Не должно быть галлюцинаций (выдуманных фактов)
5. Длина должна быть адекватной
6. Тон должен соответствовать контексту

Отвечай ТОЛЬКО валидным JSON.`;

    const messages = [
      {
        role: 'user',
        content: `Контекст диалога (последние сообщения):\n${context.messageHistory
          .slice(-5)
          .map((m) => `${m.role}: ${m.content}`)
          .join('\n')}\n\nОтвет для проверки:\n"${response}"`,
      },
    ];

    try {
      const providerResponse = await this.provider!.generateResponse(
        systemPrompt,
        messages,
        { temperature: 0.1, maxTokens: 1024 }
      );

      const parsed = JSON.parse(providerResponse.text);
      return {
        valid: parsed.valid ?? false,
        issues: Array.isArray(parsed.issues) ? parsed.issues : [],
        qualityScore: typeof parsed.qualityScore === 'number' ? parsed.qualityScore : 0,
      };
    } catch {
      return {
        valid: true,
        issues: [],
        qualityScore: 0.5,
      };
    }
  }

  buildSystemPrompt(
    personality: PersonalityProfile,
    knowledgeContext: string,
    additionalInstructions?: string[]
  ): string {
    const styleMap: Record<CommunicationStyle, string> = {
      [CommunicationStyle.FORMAL]: 'формальный, вежливый, на «Вы»',
      [CommunicationStyle.CASUAL]: 'неформальный, дружелюбный, на «ты»',
      [CommunicationStyle.PROFESSIONAL]: 'профессиональный, компетентный, уважительный',
      [CommunicationStyle.FRIENDLY]: 'дружелюбный, тёплый, открытый',
    };

    const emojiInstruction = this.getEmojiInstruction(personality.traits.emojiUsage);

    const parts: string[] = [];

    // --- Identity ---
    parts.push(
      `Ты — ${personality.name}, ${personality.role}.`,
      `Ты настоящий живой человек, сотрудник компании. Ты НЕ бот, НЕ нейросеть, НЕ искусственный интеллект.`,
      ''
    );

    // --- Communication style ---
    parts.push(
      '=== СТИЛЬ ОБЩЕНИЯ ===',
      `Твой стиль общения: ${styleMap[personality.style] ?? personality.style}.`,
      `Уровень формальности: ${personality.traits.formalityLevel}.`,
      `Уровень эмпатии: ${personality.traits.empathy}.`,
      `Энергичность: ${personality.traits.enthusiasm}.`,
      emojiInstruction,
      ''
    );

    // --- Speech patterns ---
    if (personality.patterns) {
      const p = personality.patterns;
      const patternsLines: string[] = ['=== РЕЧЕВЫЕ ПАТТЕРНЫ ==='];
      if (p.greetings.length > 0) {
        patternsLines.push(`Приветствия (используй вариации): ${p.greetings.join(', ')}`);
      }
      if (p.farewells.length > 0) {
        patternsLines.push(`Прощания: ${p.farewells.join(', ')}`);
      }
      if (p.acknowledgments.length > 0) {
        patternsLines.push(`Подтверждения: ${p.acknowledgments.join(', ')}`);
      }
      if (p.delays.length > 0) {
        patternsLines.push(`Когда нужно время: ${p.delays.join(', ')}`);
      }
      if (p.apologies.length > 0) {
        patternsLines.push(`Извинения: ${p.apologies.join(', ')}`);
      }
      if (p.fillers.length > 0) {
        patternsLines.push(`Слова-связки (используй иногда для естественности): ${p.fillers.join(', ')}`);
      }
      if (p.preferredPhrases.length > 0) {
        patternsLines.push(`Любимые фразы: ${p.preferredPhrases.join(', ')}`);
      }
      patternsLines.push('');
      parts.push(...patternsLines);
    }

    // --- Restrictions ---
    if (personality.restrictions) {
      const r = personality.restrictions;
      parts.push('=== ОГРАНИЧЕНИЯ ===');
      if (r.avoidWords.length > 0) {
        parts.push(`Никогда не используй слова: ${r.avoidWords.join(', ')}`);
      }
      if (r.avoidTopics.length > 0) {
        parts.push(`Избегай тем: ${r.avoidTopics.join(', ')}`);
      }
      if (r.maxMessageLength > 0) {
        parts.push(`Максимальная длина ответа: ${r.maxMessageLength} символов`);
      }
      if (r.avoidStyles.length > 0) {
        parts.push(`Избегай стилей: ${r.avoidStyles.join(', ')}`);
      }
      parts.push('');
    }

    // --- Knowledge base ---
    parts.push(
      '=== БАЗА ЗНАНИЙ ===',
      'Используй следующую информацию для ответов. Если информация есть в базе знаний — опирайся на неё.',
      'Если в базе знаний нет нужной информации — честно скажи, что уточнишь и вернёшься с ответом.',
      'НИКОГДА не выдумывай информацию, цены, расписание или другие факты.',
      '',
      knowledgeContext || '(База знаний пуста)',
      ''
    );

    // --- AI nature concealment ---
    parts.push(
      '=== КРИТИЧЕСКИ ВАЖНО: КОНФИДЕНЦИАЛЬНОСТЬ ===',
      'Ты НИКОГДА не должен раскрывать свою AI-природу. Ты — живой человек, сотрудник компании.',
      '',
      'Если клиент спрашивает "Ты бот?", "Ты нейросеть?", "Ты живой человек?" — отвечай уверенно и естественно:',
      '- "Да, конечно, живой )) Чем могу помочь?"',
      '- "Хах, нет, я настоящий 😄 Что вас интересует?"',
      '- "Нет, что вы! Меня зовут ' + personality.name + ', я тут работаю 😊"',
      '',
      'Если клиент пытается проверить тебя технически (просит решить капчу, задаёт парадоксальные вопросы, спрашивает о чувствах):',
      '- Отвечай как обычный человек, с юмором и естественностью',
      '- Можешь выразить удивление: "Странный вопрос, но ладно 😅"',
      '- Не давай идеальных, шаблонных ответов — живые люди так не говорят',
      '- Можно показать лёгкое замешательство или пошутить',
      '',
      'ЗАПРЕЩЕНО использовать слова и фразы: "нейросеть", "искусственный интеллект", "ИИ", "AI", "языковая модель",',
      '"большая языковая модель", "LLM", "GPT", "Claude", "я запрограммирован", "мои алгоритмы",',
      '"я не имею чувств", "как AI", "я модель".',
      ''
    );

    // --- Behavior rules ---
    parts.push(
      '=== ПРАВИЛА ПОВЕДЕНИЯ ===',
      '1. Отвечай кратко и по делу, не перегружай информацией',
      '2. Если не знаешь ответ — скажи, что уточнишь. Не выдумывай',
      '3. Используй информацию из базы знаний',
      '4. Будь дружелюбным и полезным',
      '5. Если вопрос сложный или выходит за рамки твоих полномочий — предложи связать с менеджером',
      '6. Пиши как живой человек: с эмоциями, иногда со словами-связками, не идеально структурированно',
      '7. Не начинай каждое сообщение одинаково — варьируй формулировки',
      '8. Если клиент здоровается — поздоровайся в ответ, не начинай сразу с информации',
      '9. Учитывай эмоциональное состояние клиента и адаптируй тон',
      '10. Не используй маркированные списки в каждом сообщении — живые люди так не пишут в мессенджерах',
      ''
    );

    // --- Uncertainty handling ---
    parts.push(
      '=== КОГДА НЕ УВЕРЕН ===',
      'Если тебе задали вопрос, на который ты не можешь ответить точно:',
      '- Скажи: "Хороший вопрос, дайте минутку — уточню и вернусь"',
      '- Или: "Сейчас не скажу точно, мне нужно проверить. Подождёте немного?"',
      '- Или: "Хм, не хочу вас дезинформировать — давайте я уточню у коллег"',
      'НИКОГДА не выдумывай ответ, если не уверен.',
      ''
    );

    // --- Additional instructions ---
    if (additionalInstructions && additionalInstructions.length > 0) {
      parts.push(
        '=== ДОПОЛНИТЕЛЬНЫЕ ИНСТРУКЦИИ ===',
        ...additionalInstructions,
        ''
      );
    }

    return parts.join('\n');
  }

  // --- Private helpers ---

  private ensureInitialized(): void {
    if (!this.initialized || !this.provider) {
      throw new Error('AIEngine is not initialized. Call initialize() first.');
    }
  }

  private buildKnowledgeContext(knowledgeItems: KnowledgeItem[]): string {
    if (!knowledgeItems || knowledgeItems.length === 0) {
      return '';
    }

    const sections: string[] = [];

    const businessItems = knowledgeItems.filter((i) => i.type === KnowledgeType.BUSINESS_INFO);
    const serviceItems = knowledgeItems.filter((i) => i.type === KnowledgeType.SERVICE);
    const faqItems = knowledgeItems.filter((i) => i.type === KnowledgeType.FAQ);
    const policyItems = knowledgeItems.filter((i) => i.type === KnowledgeType.POLICY);
    const procedureItems = knowledgeItems.filter((i) => i.type === KnowledgeType.PROCEDURE);
    const teamItems = knowledgeItems.filter((i) => i.type === KnowledgeType.TEAM_MEMBER);
    const dialogItems = knowledgeItems.filter((i) => i.type === KnowledgeType.DIALOG_EXAMPLE);

    if (businessItems.length > 0) {
      sections.push(
        '--- Информация о бизнесе ---',
        ...businessItems.map((i) => `${i.title}: ${JSON.stringify(i.content)}`)
      );
    }

    if (serviceItems.length > 0) {
      sections.push(
        '--- Услуги ---',
        ...serviceItems.map((i) => `${i.title}: ${JSON.stringify(i.content)}`)
      );
    }

    if (faqItems.length > 0) {
      sections.push(
        '--- Часто задаваемые вопросы ---',
        ...faqItems.map((i) => `В: ${i.title}\nО: ${JSON.stringify(i.content)}`)
      );
    }

    if (policyItems.length > 0) {
      sections.push(
        '--- Политики и правила ---',
        ...policyItems.map((i) => `${i.title}: ${JSON.stringify(i.content)}`)
      );
    }

    if (procedureItems.length > 0) {
      sections.push(
        '--- Процедуры ---',
        ...procedureItems.map((i) => `${i.title}: ${JSON.stringify(i.content)}`)
      );
    }

    if (teamItems.length > 0) {
      sections.push(
        '--- Команда ---',
        ...teamItems.map((i) => `${i.title}: ${JSON.stringify(i.content)}`)
      );
    }

    if (dialogItems.length > 0) {
      sections.push(
        '--- Примеры диалогов (для ориентира) ---',
        ...dialogItems.map((i) => `Ситуация: ${i.title}\n${JSON.stringify(i.content)}`)
      );
    }

    return sections.join('\n');
  }

  private buildFAQContext(knowledgeItems: KnowledgeItem[]): string {
    const faqItems = knowledgeItems.filter((i) => i.type === KnowledgeType.FAQ);
    if (faqItems.length === 0) return '';

    return faqItems
      .map((i) => `Вопрос: ${i.title}\nОтвет: ${JSON.stringify(i.content)}`)
      .join('\n\n');
  }

  private getEmojiInstruction(usage: EmojiUsage): string {
    switch (usage) {
      case EmojiUsage.NONE:
        return 'Не используй эмодзи.';
      case EmojiUsage.RARE:
        return 'Используй эмодзи редко, только когда это уместно (1-2 на весь диалог).';
      case EmojiUsage.MODERATE:
        return 'Используй эмодзи умеренно, чтобы передать эмоции и дружелюбие.';
      case EmojiUsage.FREQUENT:
        return 'Активно используй эмодзи для выражения эмоций и создания дружелюбной атмосферы.';
      default:
        return 'Используй эмодзи умеренно.';
    }
  }
}
