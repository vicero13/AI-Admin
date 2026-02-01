interface SelectInputProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (val: string) => void;
}

export default function SelectInput({ label, value, options, onChange }: SelectInputProps) {
  return (
    <div>
      <label className="block text-sm text-gray-700 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
