import Section from './Section';
import TextInput from '../ui/TextInput';
import SelectInput from '../ui/SelectInput';
import Slider from '../ui/Slider';
import Toggle from '../ui/Toggle';
import TagInput from '../ui/TagInput';
import TextArrayEditor from '../ui/TextArrayEditor';
import NumberInput from '../ui/NumberInput';

interface Props {
  data: any;
  onChange: (path: string, value: unknown) => void;
}

export default function PersonalitySection({ data, onChange }: Props) {
  const traits = data.traits || {};
  const patterns = data.patterns || {};
  const restrictions = data.restrictions || {};

  return (
    <Section title="Personality">
      <div className="grid grid-cols-2 gap-4">
        <TextInput label="Name" value={data.name} onChange={(v) => onChange('personality.name', v)} />
        <TextInput label="Role" value={data.role} onChange={(v) => onChange('personality.role', v)} />
      </div>
      <SelectInput
        label="Style"
        value={data.style}
        options={[
          { value: 'friendly', label: 'Friendly' },
          { value: 'formal', label: 'Formal' },
          { value: 'casual', label: 'Casual' },
        ]}
        onChange={(v) => onChange('personality.style', v)}
      />

      <h4 className="font-medium text-gray-700 mt-4 border-t pt-4">Traits</h4>
      <div className="grid grid-cols-2 gap-4">
        <SelectInput
          label="Emoji Usage"
          value={traits.emojiUsage || 'moderate'}
          options={[{ value: 'none', label: 'None' }, { value: 'low', label: 'Low' }, { value: 'moderate', label: 'Moderate' }, { value: 'high', label: 'High' }]}
          onChange={(v) => onChange('personality.traits.emojiUsage', v)}
        />
        <Slider label="Emoji Frequency" value={traits.emojiFrequency || 0.3} min={0} max={1} step={0.05} onChange={(v) => onChange('personality.traits.emojiFrequency', v)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <SelectInput label="Punctuation" value={traits.punctuation || 'casual'} options={[{ value: 'formal', label: 'Formal' }, { value: 'casual', label: 'Casual' }]} onChange={(v) => onChange('personality.traits.punctuation', v)} />
        <SelectInput label="Vocabulary" value={traits.vocabulary || 'moderate'} options={[{ value: 'simple', label: 'Simple' }, { value: 'moderate', label: 'Moderate' }, { value: 'advanced', label: 'Advanced' }]} onChange={(v) => onChange('personality.traits.vocabulary', v)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <SelectInput label="Empathy" value={traits.empathy || 'high'} options={[{ value: 'low', label: 'Low' }, { value: 'moderate', label: 'Moderate' }, { value: 'high', label: 'High' }]} onChange={(v) => onChange('personality.traits.empathy', v)} />
        <SelectInput label="Enthusiasm" value={traits.enthusiasm || 'moderate'} options={[{ value: 'low', label: 'Low' }, { value: 'moderate', label: 'Moderate' }, { value: 'high', label: 'High' }]} onChange={(v) => onChange('personality.traits.enthusiasm', v)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <SelectInput label="Formality Level" value={traits.formalityLevel || 'casual'} options={[{ value: 'formal', label: 'Formal' }, { value: 'casual', label: 'Casual' }, { value: 'mixed', label: 'Mixed' }]} onChange={(v) => onChange('personality.traits.formalityLevel', v)} />
        <Toggle label="Uses Humor" checked={traits.usesHumor ?? true} onChange={(v) => onChange('personality.traits.usesHumor', v)} />
      </div>
      <TagInput label="Preferred Emojis" tags={traits.preferredEmojis || []} onChange={(v) => onChange('personality.traits.preferredEmojis', v)} />

      <h4 className="font-medium text-gray-700 mt-4 border-t pt-4">Patterns</h4>
      <TextArrayEditor label="Greetings" items={patterns.greetings || []} onChange={(v) => onChange('personality.patterns.greetings', v)} />
      <TextArrayEditor label="Farewells" items={patterns.farewells || []} onChange={(v) => onChange('personality.patterns.farewells', v)} />
      <TextArrayEditor label="Acknowledgments" items={patterns.acknowledgments || []} onChange={(v) => onChange('personality.patterns.acknowledgments', v)} />
      <TextArrayEditor label="Delays" items={patterns.delays || []} onChange={(v) => onChange('personality.patterns.delays', v)} />
      <TextArrayEditor label="Apologies" items={patterns.apologies || []} onChange={(v) => onChange('personality.patterns.apologies', v)} />
      <TextArrayEditor label="Transitions" items={patterns.transitions || []} onChange={(v) => onChange('personality.patterns.transitions', v)} />
      <TextArrayEditor label="Fillers" items={patterns.fillers || []} onChange={(v) => onChange('personality.patterns.fillers', v)} />
      <TextArrayEditor label="Preferred Phrases" items={patterns.preferredPhrases || []} onChange={(v) => onChange('personality.patterns.preferredPhrases', v)} />

      <h4 className="font-medium text-gray-700 mt-4 border-t pt-4">Restrictions</h4>
      <TagInput label="Avoid Words" tags={restrictions.avoidWords || []} onChange={(v) => onChange('personality.restrictions.avoidWords', v)} />
      <TagInput label="Avoid Topics" tags={restrictions.avoidTopics || []} onChange={(v) => onChange('personality.restrictions.avoidTopics', v)} />
      <TagInput label="Avoid Styles" tags={restrictions.avoidStyles || []} onChange={(v) => onChange('personality.restrictions.avoidStyles', v)} />
      <NumberInput label="Max Message Length" value={restrictions.maxMessageLength || 500} onChange={(v) => onChange('personality.restrictions.maxMessageLength', v)} min={50} max={2000} />
    </Section>
  );
}
