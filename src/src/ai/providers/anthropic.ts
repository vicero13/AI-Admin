import Anthropic from '@anthropic-ai/sdk';

export interface AnthropicProviderConfig {
  apiKey: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
}

export interface ProviderResponse {
  text: string;
  tokensUsed: number;
  finishReason: string;
}

export class AnthropicProvider {
  private client: Anthropic;
  private model: string;
  private defaultMaxTokens: number;
  private defaultTemperature: number;
  private defaultTopP?: number;

  constructor(config: AnthropicProviderConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
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
      const anthropicMessages = messages.map((msg) => ({
        role: (msg.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: msg.content,
      }));

      const createParams = {
        model: this.model,
        max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
        temperature: options?.temperature ?? this.defaultTemperature,
        ...(options?.topP !== undefined || this.defaultTopP !== undefined
          ? { top_p: options?.topP ?? this.defaultTopP }
          : {}),
        system: systemPrompt,
        messages: anthropicMessages,
      };

      let responsePromise = this.client.messages.create(createParams);

      // Apply timeout if specified
      if (options?.timeoutMs && options.timeoutMs > 0) {
        responsePromise = Promise.race([
          responsePromise,
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`AI request timed out after ${options.timeoutMs}ms`)), options.timeoutMs)
          ),
        ]) as typeof responsePromise;
      }

      const response = await responsePromise;

      const textContent = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('');

      const tokensUsed =
        (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0);

      const finishReason = this.mapStopReason(response.stop_reason);

      return {
        text: textContent,
        tokensUsed,
        finishReason,
      };
    } catch (error: unknown) {
      if (error instanceof Anthropic.APIError) {
        throw new Error(
          `Anthropic API error [${error.status}]: ${error.message}`
        );
      }
      if (error instanceof Error) {
        throw new Error(`Anthropic provider error: ${error.message}`);
      }
      throw new Error('Anthropic provider: unknown error occurred');
    }
  }

  private mapStopReason(stopReason: string | null): string {
    switch (stopReason) {
      case 'end_turn':
        return 'stop';
      case 'max_tokens':
        return 'length';
      case 'stop_sequence':
        return 'stop';
      default:
        return 'stop';
    }
  }
}
