import Section from './Section';
import Toggle from '../ui/Toggle';
import TextInput from '../ui/TextInput';
import NumberInput from '../ui/NumberInput';

interface Props {
  data: any;
  onChange: (path: string, value: unknown) => void;
}

export default function RedisSection({ data, onChange }: Props) {
  return (
    <Section title="Redis">
      <Toggle label="Enabled" checked={data.enabled} onChange={(v) => onChange('redis.enabled', v)} />
      {data.enabled && (
        <div className="grid grid-cols-2 gap-4 mt-3">
          <TextInput label="Host" value={data.host} onChange={(v) => onChange('redis.host', v)} />
          <NumberInput label="Port" value={data.port} onChange={(v) => onChange('redis.port', v)} min={1} max={65535} />
          <NumberInput label="DB" value={data.db} onChange={(v) => onChange('redis.db', v)} min={0} />
          <TextInput label="Key Prefix" value={data.keyPrefix} onChange={(v) => onChange('redis.keyPrefix', v)} />
        </div>
      )}
    </Section>
  );
}
