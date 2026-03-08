import { useState, useEffect } from 'react';
import api from '../../api/client';
import { useToast } from '../ui/Toast';
import TagInput from '../ui/TagInput';

interface FAQEntry {
  faqId: string;
  question: string;
  answer: string;
  category: string;
  alternativeQuestions: string[];
  relatedQuestions: string[];
  popularity: number;
  tags: string[];
  deferToViewing?: boolean;
  onlyOnDirectQuestion?: boolean;
  showAllOffices?: boolean;
  answerBehavior?: string;
  handoffTrigger?: string;
}

const emptyFaq: FAQEntry = {
  faqId: '', question: '', answer: '', category: '',
  alternativeQuestions: [], relatedQuestions: [], popularity: 50, tags: [],
};

function FAQCard({ item, onChange, onDelete }: {
  item: FAQEntry; onChange: (item: FAQEntry) => void; onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const upd = (patch: Partial<FAQEntry>) => onChange({ ...item, ...patch });

  return (
    <div className="border border-gray-200 rounded-lg">
      <div className="flex items-center justify-between p-3 hover:bg-gray-50">
        <button onClick={() => setExpanded(!expanded)} className="flex-1 text-left flex items-center gap-2">
          <svg className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${expanded ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          <span className="text-sm font-medium text-gray-800 truncate">{item.question || '(без вопроса)'}</span>
          <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded flex-shrink-0">{item.faqId}</span>
          <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[10px] rounded flex-shrink-0">{item.category}</span>
        </button>
        <button onClick={onDelete} className="ml-2 text-red-400 hover:text-red-600 flex-shrink-0" title="Удалить">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
      {expanded && (
        <div className="p-3 pt-0 space-y-3 border-t border-gray-100">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">FAQ ID</label>
              <input value={item.faqId} onChange={(e) => upd({ faqId: e.target.value })}
                className="w-full px-2 py-1.5 border rounded text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Категория</label>
              <input value={item.category} onChange={(e) => upd({ category: e.target.value })}
                className="w-full px-2 py-1.5 border rounded text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Популярность (0-100)</label>
              <input type="number" min={0} max={100} value={item.popularity}
                onChange={(e) => upd({ popularity: Number(e.target.value) })}
                className="w-full px-2 py-1.5 border rounded text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Вопрос</label>
            <input value={item.question} onChange={(e) => upd({ question: e.target.value })}
              className="w-full px-2 py-1.5 border rounded text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Ответ</label>
            <textarea value={item.answer} onChange={(e) => upd({ answer: e.target.value })}
              rows={5} className="w-full px-2 py-1.5 border rounded text-sm font-mono" />
          </div>
          <TagInput label="Альтернативные вопросы" tags={item.alternativeQuestions || []}
            onChange={(alternativeQuestions) => upd({ alternativeQuestions })} />
          <TagInput label="Связанные вопросы (ID)" tags={item.relatedQuestions || []}
            onChange={(relatedQuestions) => upd({ relatedQuestions })} />
          <TagInput label="Теги" tags={item.tags || []} onChange={(tags) => upd({ tags })} />

          {/* Optional flags */}
          <div className="flex flex-wrap gap-4 pt-1">
            <label className="flex items-center gap-1.5 text-xs text-gray-600">
              <input type="checkbox" checked={!!item.deferToViewing}
                onChange={(e) => upd({ deferToViewing: e.target.checked })} />
              Отложить до просмотра
            </label>
            <label className="flex items-center gap-1.5 text-xs text-gray-600">
              <input type="checkbox" checked={!!item.onlyOnDirectQuestion}
                onChange={(e) => upd({ onlyOnDirectQuestion: e.target.checked })} />
              Только при прямом вопросе
            </label>
            <label className="flex items-center gap-1.5 text-xs text-gray-600">
              <input type="checkbox" checked={!!item.showAllOffices}
                onChange={(e) => upd({ showAllOffices: e.target.checked })} />
              Показать все офисы
            </label>
          </div>
          {(item.answerBehavior || item.handoffTrigger) && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Answer Behavior</label>
                <input value={item.answerBehavior || ''} onChange={(e) => upd({ answerBehavior: e.target.value })}
                  className="w-full px-2 py-1.5 border rounded text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Handoff Trigger</label>
                <input value={item.handoffTrigger || ''} onChange={(e) => upd({ handoffTrigger: e.target.value })}
                  className="w-full px-2 py-1.5 border rounded text-sm" />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function FAQEditor() {
  const [files, setFiles] = useState<string[]>([]);
  const [selected, setSelected] = useState('');
  const [data, setData] = useState<FAQEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    api.get('/knowledge/faq').then((res) => {
      setFiles(res.data.files);
      if (res.data.files.length > 0) {
        const first = res.data.files[0];
        setSelected(first);
        setData(res.data.data[first] || []);
      }
      setLoading(false);
    });
  }, []);

  const loadFile = async (filename: string) => {
    setSelected(filename);
    setDirty(false);
    const res = await api.get(`/knowledge/faq/${filename}`);
    setData(res.data || []);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/knowledge/faq/${selected}`, data);
      setDirty(false);
      toast('success', `${selected} saved`);
    } catch {
      toast('error', `Failed to save ${selected}`);
    } finally {
      setSaving(false);
    }
  };

  const updateItem = (index: number, item: FAQEntry) => {
    const next = [...data];
    next[index] = item;
    setData(next);
    setDirty(true);
  };

  const deleteItem = (index: number) => {
    setData(data.filter((_, i) => i !== index));
    setDirty(true);
  };

  const addItem = () => {
    const id = `faq-new-${Date.now().toString(36)}`;
    setData([...data, { ...emptyFaq, faqId: id }]);
    setDirty(true);
  };

  if (loading) return <div className="text-gray-500">Loading...</div>;

  return (
    <div className="space-y-4">
      {/* File tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {files.map((f) => (
            <button key={f} onClick={() => loadFile(f)}
              className={`px-3 py-1.5 text-sm rounded-lg ${selected === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {dirty && <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full">не сохранено</span>}
          <button onClick={handleSave} disabled={saving || !dirty}
            className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* FAQ count and add */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">{data.length} записей</span>
        <button onClick={addItem} className="text-sm text-blue-600 hover:text-blue-800">+ Добавить FAQ</button>
      </div>

      {/* FAQ list */}
      <div className="space-y-2">
        {data.map((item, i) => (
          <FAQCard key={item.faqId || i} item={item}
            onChange={(updated) => updateItem(i, updated)}
            onDelete={() => deleteItem(i)} />
        ))}
      </div>
    </div>
  );
}
