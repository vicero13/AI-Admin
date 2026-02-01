interface TextArrayEditorProps {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
}

export default function TextArrayEditor({ label, items, onChange }: TextArrayEditorProps) {
  const updateItem = (index: number, value: string) => {
    const copy = [...items];
    copy[index] = value;
    onChange(copy);
  };

  const addItem = () => onChange([...items, '']);

  const removeItem = (index: number) => onChange(items.filter((_, i) => i !== index));

  return (
    <div>
      <label className="block text-sm text-gray-700 mb-1">{label}</label>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2">
            <input
              value={item}
              onChange={(e) => updateItem(i, e.target.value)}
              className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button type="button" onClick={() => removeItem(i)} className="px-2 text-red-400 hover:text-red-600 text-lg">&times;</button>
          </div>
        ))}
      </div>
      <button type="button" onClick={addItem} className="mt-1.5 text-sm text-blue-600 hover:text-blue-800">+ Add</button>
    </div>
  );
}
