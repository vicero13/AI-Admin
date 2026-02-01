import { useState, KeyboardEvent } from 'react';

interface TagInputProps {
  label: string;
  tags: string[];
  onChange: (tags: string[]) => void;
}

export default function TagInput({ label, tags, onChange }: TagInputProps) {
  const [input, setInput] = useState('');

  const addTag = () => {
    const trimmed = input.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInput('');
  };

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); addTag(); }
  };

  return (
    <div>
      <label className="block text-sm text-gray-700 mb-1">{label}</label>
      <div className="flex flex-wrap gap-1.5 p-2 border border-gray-300 rounded-lg min-h-[42px]">
        {tags.map((tag, i) => (
          <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
            {tag}
            <button type="button" onClick={() => removeTag(i)} className="text-blue-500 hover:text-blue-700">&times;</button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addTag}
          placeholder="Enter + Add"
          className="flex-1 min-w-[100px] text-sm outline-none"
        />
      </div>
    </div>
  );
}
