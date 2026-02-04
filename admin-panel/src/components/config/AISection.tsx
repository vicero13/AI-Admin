import { useMemo } from 'react';
import Section from './Section';
import NumberInput from '../ui/NumberInput';
import SelectInput from '../ui/SelectInput';
import Slider from '../ui/Slider';
import Toggle from '../ui/Toggle';

const MODELS_BY_PROVIDER: Record<string, { value: string; label: string }[]> = {
  anthropic: [
    { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4 (Latest)' },
    { value: 'claude-opus-4-20250514', label: 'Claude Opus 4' },
    { value: 'claude-3-7-sonnet-20250219', label: 'Claude 3.7 Sonnet' },
    { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
    { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku (Fast)' },
    { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
    { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
  ],
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o (Latest)' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast)' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-4', label: 'GPT-4' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  ],
};

interface Props {
  data: { provider: string; model: string; temperature: number; maxTokens: number; cacheEnabled: boolean; cacheTTL: number };
  onChange: (path: string, value: unknown) => void;
}

export default function AISection({ data, onChange }: Props) {
  const modelOptions = useMemo(() => {
    const options = MODELS_BY_PROVIDER[data.provider] || [];
    // Если текущая модель не в списке — добавим её как кастомную
    if (data.model && !options.find(o => o.value === data.model)) {
      return [...options, { value: data.model, label: `${data.model} (Custom)` }];
    }
    return options;
  }, [data.provider, data.model]);

  const handleProviderChange = (newProvider: string) => {
    onChange('ai.provider', newProvider);
    // Автоматически выбираем первую модель нового провайдера
    const defaultModel = MODELS_BY_PROVIDER[newProvider]?.[0]?.value;
    if (defaultModel) {
      onChange('ai.model', defaultModel);
    }
  };

  return (
    <Section title="AI Engine">
      <div className="grid grid-cols-2 gap-4">
        <SelectInput
          label="Provider"
          value={data.provider}
          options={[
            { value: 'anthropic', label: 'Anthropic (Claude)' },
            { value: 'openai', label: 'OpenAI (GPT)' },
          ]}
          onChange={handleProviderChange}
        />
        <SelectInput
          label="Model"
          value={data.model}
          options={modelOptions}
          onChange={(v) => onChange('ai.model', v)}
        />
      </div>
      <Slider label="Temperature" value={data.temperature} min={0} max={1} step={0.05} onChange={(v) => onChange('ai.temperature', v)} />
      <div className="grid grid-cols-2 gap-4">
        <NumberInput label="Max Tokens" value={data.maxTokens} onChange={(v) => onChange('ai.maxTokens', v)} min={1} max={4096} />
        <NumberInput label="Cache TTL (sec)" value={data.cacheTTL} onChange={(v) => onChange('ai.cacheTTL', v)} min={0} />
      </div>
      <Toggle label="Cache Enabled" checked={data.cacheEnabled} onChange={(v) => onChange('ai.cacheEnabled', v)} />
    </Section>
  );
}
