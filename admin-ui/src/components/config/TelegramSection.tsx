import Section from './Section';
import TextInput from '../ui/TextInput';

interface Props {
  data: any;
  onChange: (path: string, value: unknown) => void;
}

export default function TelegramSection({ data, onChange }: Props) {
  const wh = data.webhook || {};
  return (
    <Section title="Telegram">
      <TextInput label="Webhook URL" value={wh.url || ''} onChange={(v) => onChange('telegram.webhook.url', v)} placeholder="https://your-domain.com/webhook/telegram" />
      <TextInput label="Webhook Path" value={wh.path || '/webhook/telegram'} onChange={(v) => onChange('telegram.webhook.path', v)} />
      <TextInput label="Webhook Secret" value={wh.secret || ''} onChange={(v) => onChange('telegram.webhook.secret', v)} type="password" />
    </Section>
  );
}
