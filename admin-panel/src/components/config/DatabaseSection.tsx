import Section from './Section';
import SelectInput from '../ui/SelectInput';
import TextInput from '../ui/TextInput';
import NumberInput from '../ui/NumberInput';

interface Props {
  data: any;
  onChange: (path: string, value: unknown) => void;
}

export default function DatabaseSection({ data, onChange }: Props) {
  const pg = data.postgres || {};
  return (
    <Section title="Database">
      <SelectInput
        label="Type"
        value={data.type}
        options={[
          { value: 'memory', label: 'In-Memory' },
          { value: 'postgres', label: 'PostgreSQL' },
        ]}
        onChange={(v) => onChange('database.type', v)}
      />
      {data.type === 'postgres' && (
        <div className="grid grid-cols-2 gap-4 mt-3">
          <TextInput label="Host" value={pg.host} onChange={(v) => onChange('database.postgres.host', v)} />
          <NumberInput label="Port" value={pg.port} onChange={(v) => onChange('database.postgres.port', v)} min={1} max={65535} />
          <TextInput label="Database" value={pg.database} onChange={(v) => onChange('database.postgres.database', v)} />
          <TextInput label="User" value={pg.user} onChange={(v) => onChange('database.postgres.user', v)} />
          <TextInput label="Password" value={pg.password} onChange={(v) => onChange('database.postgres.password', v)} type="password" />
          <NumberInput label="Max Connections" value={pg.maxConnections} onChange={(v) => onChange('database.postgres.maxConnections', v)} min={1} />
        </div>
      )}
    </Section>
  );
}
