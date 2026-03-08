import { useState, useEffect } from 'react';
import api from '../../api/client';
import { useToast } from '../ui/Toast';
import TagInput from '../ui/TagInput';

interface PolicyEntry {
  policyId: string;
  name: string;
  type: string;
  content: string;
  summary: string;
  keyPoints: string[];
  lastUpdated: number;
  metadata?: { version?: string };
}

function PolicyForm({ item, onChange }: { item: PolicyEntry; onChange: (p: PolicyEntry) => void }) {
  const upd = (patch: Partial<PolicyEntry>) => onChange({ ...item, ...patch });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Policy ID</label>
          <input value={item.policyId} onChange={(e) => upd({ policyId: e.target.value })}
            className="w-full px-2 py-1.5 border rounded text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Название</label>
          <input value={item.name || ''} onChange={(e) => upd({ name: e.target.value })}
            className="w-full px-2 py-1.5 border rounded text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Тип</label>
          <input value={item.type} onChange={(e) => upd({ type: e.target.value })}
            className="w-full px-2 py-1.5 border rounded text-sm" />
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Содержание</label>
        <textarea value={item.content} onChange={(e) => upd({ content: e.target.value })}
          rows={8} className="w-full px-2 py-1.5 border rounded text-sm font-mono" />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Краткое описание</label>
        <textarea value={item.summary} onChange={(e) => upd({ summary: e.target.value })}
          rows={3} className="w-full px-2 py-1.5 border rounded text-sm" />
      </div>
      <TagInput label="Ключевые пункты" tags={item.keyPoints || []} onChange={(keyPoints) => upd({ keyPoints })} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Версия</label>
          <input value={item.metadata?.version || ''} onChange={(e) => upd({ metadata: { ...item.metadata, version: e.target.value } })}
            className="w-full px-2 py-1.5 border rounded text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Обновлено</label>
          <input value={item.lastUpdated ? new Date(item.lastUpdated).toLocaleDateString('ru-RU') : ''}
            className="w-full px-2 py-1.5 border rounded text-sm bg-gray-50" readOnly />
        </div>
      </div>
    </div>
  );
}

export default function PolicyEditor() {
  const [files, setFiles] = useState<string[]>([]);
  const [selected, setSelected] = useState('');
  const [data, setData] = useState<PolicyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    api.get('/knowledge/policies').then((res) => {
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
    const res = await api.get(`/knowledge/policies/${filename}`);
    setData(res.data || []);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/knowledge/policies/${selected}`, data);
      setDirty(false);
      toast('success', `${selected} saved`);
    } catch {
      toast('error', `Failed to save ${selected}`);
    } finally {
      setSaving(false);
    }
  };

  const updateItem = (index: number, item: PolicyEntry) => {
    const next = [...data];
    next[index] = { ...item, lastUpdated: Date.now() };
    setData(next);
    setDirty(true);
  };

  const deleteItem = (index: number) => {
    setData(data.filter((_, i) => i !== index));
    setDirty(true);
  };

  const addItem = () => {
    setData([...data, {
      policyId: `policy-${Date.now().toString(36)}`, name: '', type: selected.replace('.json', ''),
      content: '', summary: '', keyPoints: [], lastUpdated: Date.now(), metadata: { version: '1.0' },
    }]);
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

      {/* Policies */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">{data.length} политик(и)</span>
        <button onClick={addItem} className="text-sm text-blue-600 hover:text-blue-800">+ Добавить политику</button>
      </div>

      <div className="space-y-4">
        {data.map((item, i) => (
          <div key={item.policyId || i} className="border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-800">{item.name || item.policyId}</span>
              <button onClick={() => deleteItem(i)} className="text-red-400 hover:text-red-600" title="Удалить">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
            <PolicyForm item={item} onChange={(updated) => updateItem(i, updated)} />
          </div>
        ))}
      </div>
    </div>
  );
}
