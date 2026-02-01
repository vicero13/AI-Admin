import { useState } from 'react';
import api from '../api/client';
import { useToast } from '../components/ui/Toast';

const TARGET_TYPES = [
  { value: 'faq', label: 'FAQ Items' },
  { value: 'service', label: 'Services' },
  { value: 'dialog', label: 'Dialog Examples' },
  { value: 'policy', label: 'Policies' },
];

export default function ConverterPage() {
  const [text, setText] = useState('');
  const [targetType, setTargetType] = useState('faq');
  const [result, setResult] = useState<any[] | null>(null);
  const [resultJson, setResultJson] = useState('');
  const [converting, setConverting] = useState(false);
  const [adding, setAdding] = useState(false);
  const { toast } = useToast();

  const convert = async () => {
    if (!text.trim()) return;
    setConverting(true);
    setResult(null);
    try {
      const res = await api.post('/converter', { text, targetType });
      setResult(res.data.items);
      setResultJson(JSON.stringify(res.data.items, null, 2));
      toast('success', `Converted to ${res.data.count} ${targetType} item(s).`);
    } catch (e: any) {
      toast('error', `Conversion failed: ${e.response?.data?.error || e.message}`);
    } finally {
      setConverting(false);
    }
  };

  const addToKB = async () => {
    if (!resultJson) return;
    setAdding(true);
    try {
      let parsed: unknown;
      try {
        parsed = JSON.parse(resultJson);
      } catch {
        toast('error', 'Invalid JSON. Fix before adding.');
        setAdding(false);
        return;
      }

      const endpoint = targetType === 'dialog'
        ? '/knowledge/dialogs/import'
        : `/knowledge/${targetType === 'faq' ? 'faq/converted.json' : targetType === 'service' ? 'services' : 'policies/converted.json'}`;

      if (targetType === 'dialog') {
        await api.post(endpoint, { dialogs: parsed });
      } else {
        await api.put(endpoint, parsed);
      }

      toast('success', 'Added to Knowledge Base!');
      setResult(null);
      setResultJson('');
      setText('');
    } catch (e: any) {
      toast('error', `Failed to add: ${e.response?.data?.error || e.message}`);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">AI Converter</h2>
      <p className="text-sm text-gray-500 mb-6">Paste unstructured text and convert it to structured JSON using AI</p>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <label className="text-sm font-medium text-gray-700">Target Type:</label>
            <select
              value={targetType}
              onChange={(e) => setTargetType(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white"
            >
              {TARGET_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your text here... (e.g., FAQ questions, service descriptions, dialog transcripts)"
            className="w-full h-[400px] p-4 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={convert}
            disabled={converting || !text.trim()}
            className="mt-3 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {converting ? 'Converting...' : 'Convert with AI'}
          </button>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-3">Result JSON:</p>
          {result ? (
            <>
              <textarea
                value={resultJson}
                onChange={(e) => setResultJson(e.target.value)}
                className="w-full h-[400px] p-4 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={addToKB}
                disabled={adding}
                className="mt-3 px-6 py-2.5 bg-green-600 text-white rounded-lg font-medium text-sm hover:bg-green-700 disabled:opacity-50"
              >
                {adding ? 'Adding...' : 'Add to Knowledge Base'}
              </button>
            </>
          ) : (
            <div className="w-full h-[400px] p-4 border border-gray-200 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 text-sm">
              Result will appear here after conversion
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
