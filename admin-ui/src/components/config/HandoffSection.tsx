import Section from './Section';
import TagInput from '../ui/TagInput';
import TextArrayEditor from '../ui/TextArrayEditor';
import NumberInput from '../ui/NumberInput';

interface Props {
  data: any;
  onChange: (path: string, value: unknown) => void;
}

export default function HandoffSection({ data, onChange }: Props) {
  const custom = data.customStallingMessages || {};

  return (
    <Section title="Handoff">
      <TagInput label="Auto Handoff Triggers" tags={data.autoHandoffTriggers || []} onChange={(v) => onChange('handoff.autoHandoffTriggers', v)} />
      <TagInput label="Notification Channels" tags={data.notificationChannels || []} onChange={(v) => onChange('handoff.notificationChannels', v)} />
      <TextArrayEditor label="Stalling Messages" items={data.stallingMessages || []} onChange={(v) => onChange('handoff.stallingMessages', v)} />

      <div className="grid grid-cols-2 gap-4">
        <NumberInput label="Estimated Wait Time (sec)" value={data.estimatedWaitTime || 120} onChange={(v) => onChange('handoff.estimatedWaitTime', v)} min={0} />
        <NumberInput label="Max Wait Before Escalation (sec)" value={data.maxWaitBeforeEscalation || 300} onChange={(v) => onChange('handoff.maxWaitBeforeEscalation', v)} min={0} />
      </div>

      <h4 className="font-medium text-gray-600 text-sm mt-4">Custom Stalling Messages</h4>
      {Object.keys(custom).map((key) => (
        <TextArrayEditor
          key={key}
          label={key}
          items={custom[key] || []}
          onChange={(v) => onChange(`handoff.customStallingMessages.${key}`, v)}
        />
      ))}
    </Section>
  );
}
