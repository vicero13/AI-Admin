import { useState, useEffect } from 'react';
import { useToast } from '../ui/Toast';
import SaveButton from '../ui/SaveButton';

interface JsonEditorProps {
  data: unknown;
  saving: boolean;
  onSave: (data: unknown) => Promise<boolean>;
  title: string;
}

export default function JsonEditor({ data, saving, onSave, title }: JsonEditorProps) {
  const [text, setText] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setText(JSON.stringify(data, null, 2));
  }, [data]);

  const handleSave = async () => {
    try {
      const parsed = JSON.parse(text);
      setParseError(null);
      const ok = await onSave(parsed);
      if (ok) {
        toast('success', `${title} saved successfully.`);
      } else {
        toast('error', `Failed to save ${title}.`);
      }
    } catch (e: any) {
      setParseError(e.message);
      toast('error', `Invalid JSON: ${e.message}`);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-gray-800">{title}</h3>
        <SaveButton saving={saving} onClick={handleSave} />
      </div>
      {parseError && <div className="mb-2 p-2 bg-red-50 text-red-600 text-sm rounded">{parseError}</div>}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="w-full h-[500px] font-mono text-sm p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        spellCheck={false}
      />
    </div>
  );
}
