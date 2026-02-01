import Section from './Section';
import TextInput from '../ui/TextInput';
import NumberInput from '../ui/NumberInput';
import SelectInput from '../ui/SelectInput';
import Slider from '../ui/Slider';
import Toggle from '../ui/Toggle';

interface Props {
  data: { provider: string; model: string; temperature: number; maxTokens: number; cacheEnabled: boolean; cacheTTL: number };
  onChange: (path: string, value: unknown) => void;
}

export default function AISection({ data, onChange }: Props) {
  return (
    <Section title="AI Engine">
      <div className="grid grid-cols-2 gap-4">
        <SelectInput
          label="Provider"
          value={data.provider}
          options={[
            { value: 'anthropic', label: 'Anthropic' },
            { value: 'openai', label: 'OpenAI' },
          ]}
          onChange={(v) => onChange('ai.provider', v)}
        />
        <TextInput label="Model" value={data.model} onChange={(v) => onChange('ai.model', v)} />
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
