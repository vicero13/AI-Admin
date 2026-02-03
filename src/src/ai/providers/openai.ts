import OpenAI from 'openai';
import { ProviderResponse, AIProviderInterface } from './anthropic';

export interface OpenAIProviderConfig {
  apiKey: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
}

export class OpenAIProvider implements AIProviderInterface {
  private client: OpenAI;
  private model: string;
  private defaultMaxTokens: number;
  private defaultTemperature: number;
  private defaultTopP?: number;

  constructor(config: OpenAIProviderConfig) {
    this.client = new OpenAI({ apiKey: config.apiKey });
    this.model = config.model;
    this.defaultMaxTokens = config.maxTokens ?? 4096;
    this.defaultTemperature = config.temperature ?? 0.7;
    this.defaultTopP = config.topP;
  }

  async generateResponse(
    systemPrompt: string,
    messages: Array<{ role: string; content: string }>,
    options?: { temperature?: number; maxTokens?: number; topP?: number; timeoutMs?: number }
  ): Promise<ProviderResponse> {
    try {
      const openaiMessages: OpenAI.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        ...messages.map((msg) => ({
          role: (msg.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
          content: msg.content,
        })),
      ];

      const createParams: OpenAI.ChatCompletionCreateParamsNonStreaming = {
        model: this.model,
        max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
        temperature: options?.temperature ?? this.defaultTemperature,
        ...(options?.topP !== undefined || this.defaultTopP !== undefined
          ? { top_p: options?.topP ?? this.defaultTopP }
          : {}),
        messages: openaiMessages,
      };

      let responsePromise: Promise<OpenAI.ChatCompletion> = this.client.chat.completions.create(createParams);

      // Apply timeout if specified
      if (options?.timeoutMs && options.timeoutMs > 0) {
        responsePromise = Promise.race([
          responsePromise,
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`AI request timed out after ${options.timeoutMs}ms`)), options.timeoutMs)
          ),
        ]);
      }

      const response = await responsePromise;

      const textContent = response.choices?.[0]?.message?.content ?? '';

      const tokensUsed =
        (response.usage?.prompt_tokens ?? 0) + (response.usage?.completion_tokens ?? 0);

      const finishReason = response.choices?.[0]?.finish_reason ?? 'stop';

      return {
        text: textContent,
        tokensUsed,
        finishReason,
      };
    } catch (error: unknown) {
      if (error instanceof OpenAI.APIError) {
        throw new Error(
          `OpenAI API error [${error.status}]: ${error.message}`
        );
      }
      if (error instanceof Error) {
        throw new Error(`OpenAI provider error: ${error.message}`);
      }
      throw new Error('OpenAI provider: unknown error occurred');
    }
  }
}
