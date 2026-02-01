interface NumberInputProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export default function NumberInput({ label, value, onChange, min, max, step }: NumberInputProps) {
  return (
    <div>
      <label className="block text-sm text-gray-700 mb-1">{label}</label>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  );
}
