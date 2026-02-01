import Section from './Section';
import NumberInput from '../ui/NumberInput';
import TextInput from '../ui/TextInput';

interface Props {
  data: { port: number; host: string };
  onChange: (path: string, value: unknown) => void;
}

export default function ServerSection({ data, onChange }: Props) {
  return (
    <Section title="Server">
      <div className="grid grid-cols-2 gap-4">
        <NumberInput label="Port" value={data.port} onChange={(v) => onChange('server.port', v)} min={1} max={65535} />
        <TextInput label="Host" value={data.host} onChange={(v) => onChange('server.host', v)} />
      </div>
    </Section>
  );
}
