import Section from './Section';
import SelectInput from '../ui/SelectInput';

interface Props {
  data: any;
  onChange: (path: string, value: unknown) => void;
}

export default function LoggingSection({ data, onChange }: Props) {
  return (
    <Section title="Logging">
      <SelectInput
        label="Level"
        value={data.level}
        options={[
          { value: 'debug', label: 'Debug' },
          { value: 'info', label: 'Info' },
          { value: 'warn', label: 'Warning' },
          { value: 'error', label: 'Error' },
        ]}
        onChange={(v) => onChange('logging.level', v)}
      />
    </Section>
  );
}
