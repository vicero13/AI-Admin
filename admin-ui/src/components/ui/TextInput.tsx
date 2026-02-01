interface TextInputProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  type?: string;
  placeholder?: string;
}

export default function TextInput({ label, value, onChange, type = 'text', placeholder }: TextInputProps) {
  return (
    <div>
      <label className="block text-sm text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  );
}
