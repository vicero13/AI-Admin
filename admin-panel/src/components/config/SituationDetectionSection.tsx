import Section from './Section';
import Slider from '../ui/Slider';
import NumberInput from '../ui/NumberInput';
import TagInput from '../ui/TagInput';

interface Props {
  data: any;
  onChange: (path: string, value: unknown) => void;
}

export default function SituationDetectionSection({ data, onChange }: Props) {
  const p = data.aiProbing || {};
  const c = data.complexity || {};
  const e = data.emotional || {};
  const conf = data.confidence || {};

  return (
    <Section title="Situation Detection">
      <h4 className="font-medium text-gray-600 text-sm">AI Probing</h4>
      <div className="grid grid-cols-2 gap-4">
        <Slider label="Min Confidence" value={p.minConfidence ?? 0.6} min={0} max={1} step={0.05} onChange={(v) => onChange('situationDetection.aiProbing.minConfidence', v)} />
        <Slider label="Handoff Threshold" value={p.handoffThreshold ?? 0.8} min={0} max={1} step={0.05} onChange={(v) => onChange('situationDetection.aiProbing.handoffThreshold', v)} />
      </div>

      <h4 className="font-medium text-gray-600 text-sm mt-4">Complexity</h4>
      <div className="grid grid-cols-2 gap-4">
        <NumberInput label="Max Score" value={c.maxScore ?? 70} onChange={(v) => onChange('situationDetection.complexity.maxScore', v)} min={0} max={100} />
        <NumberInput label="Handoff Threshold" value={c.handoffThreshold ?? 75} onChange={(v) => onChange('situationDetection.complexity.handoffThreshold', v)} min={0} max={100} />
      </div>

      <h4 className="font-medium text-gray-600 text-sm mt-4">Emotional</h4>
      <Slider label="Escalation Threshold" value={e.escalationThreshold ?? 0.7} min={0} max={1} step={0.05} onChange={(v) => onChange('situationDetection.emotional.escalationThreshold', v)} />
      <TagInput label="Handoff States" tags={e.handoffStates || []} onChange={(v) => onChange('situationDetection.emotional.handoffStates', v)} />

      <h4 className="font-medium text-gray-600 text-sm mt-4">Confidence</h4>
      <div className="grid grid-cols-2 gap-4">
        <NumberInput label="Min Score" value={conf.minScore ?? 40} onChange={(v) => onChange('situationDetection.confidence.minScore', v)} min={0} max={100} />
        <NumberInput label="Handoff Threshold" value={conf.handoffThreshold ?? 30} onChange={(v) => onChange('situationDetection.confidence.handoffThreshold', v)} min={0} max={100} />
      </div>
    </Section>
  );
}
