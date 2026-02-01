interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}

export default function Toggle({ label, checked, onChange }: ToggleProps) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div className="relative">
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div className={`w-10 h-6 rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-gray-300'}`} />
        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </div>
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );
}
