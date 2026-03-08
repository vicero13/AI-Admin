import { useState } from 'react';
import { useKnowledgeBase } from '../../hooks/useKnowledgeBase';
import { useToast } from '../ui/Toast';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  description: string;
  phone?: string;
  email?: string;
  location?: string;
}

const emptyMember: TeamMember = {
  id: '', name: '', role: '', description: '', phone: '', email: '', location: '',
};

export default function TeamEditor() {
  const { data, loading, saving, error, save } = useKnowledgeBase<TeamMember[]>('team');
  const [local, setLocal] = useState<TeamMember[] | null>(null);
  const [dirty, setDirty] = useState(false);
  const { toast } = useToast();

  if (data && !local) setLocal([...data]);

  if (loading) return <div className="text-gray-500">Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!local) return null;

  const handleSave = async () => {
    const ok = await save(local);
    if (ok) { setDirty(false); toast('success', 'Team saved'); }
    else toast('error', 'Failed to save');
  };

  const updateItem = (index: number, patch: Partial<TeamMember>) => {
    const next = [...local];
    next[index] = { ...next[index], ...patch };
    setLocal(next);
    setDirty(true);
  };

  const deleteItem = (index: number) => {
    setLocal(local.filter((_, i) => i !== index));
    setDirty(true);
  };

  const addItem = () => {
    setLocal([...local, { ...emptyMember, id: `member-${Date.now().toString(36)}` }]);
    setDirty(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-gray-800">team.json</h3>
          <span className="text-sm text-gray-500">({local.length} участников)</span>
          {dirty && <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full">не сохранено</span>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={addItem} className="text-sm text-blue-600 hover:text-blue-800">+ Добавить участника</button>
          <button onClick={handleSave} disabled={saving || !dirty}
            className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {local.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <p className="text-sm">Нет участников команды</p>
          <button onClick={addItem} className="mt-2 text-sm text-blue-600 hover:text-blue-800">+ Добавить первого участника</button>
        </div>
      )}

      <div className="space-y-3">
        {local.map((m, i) => (
          <div key={m.id || i} className="border border-gray-200 rounded-lg p-3 space-y-3">
            <div className="flex items-start justify-between">
              <div className="grid grid-cols-3 gap-3 flex-1">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Имя</label>
                  <input value={m.name} onChange={(e) => updateItem(i, { name: e.target.value })}
                    className="w-full px-2 py-1.5 border rounded text-sm" placeholder="Имя Фамилия" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Роль</label>
                  <input value={m.role} onChange={(e) => updateItem(i, { role: e.target.value })}
                    className="w-full px-2 py-1.5 border rounded text-sm" placeholder="Менеджер" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Локация</label>
                  <input value={m.location || ''} onChange={(e) => updateItem(i, { location: e.target.value })}
                    className="w-full px-2 py-1.5 border rounded text-sm" placeholder="Сокол" />
                </div>
              </div>
              <button onClick={() => deleteItem(i)} className="ml-3 text-red-400 hover:text-red-600" title="Удалить">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Описание</label>
              <textarea value={m.description} onChange={(e) => updateItem(i, { description: e.target.value })}
                rows={2} className="w-full px-2 py-1.5 border rounded text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Телефон</label>
                <input value={m.phone || ''} onChange={(e) => updateItem(i, { phone: e.target.value })}
                  className="w-full px-2 py-1.5 border rounded text-sm" placeholder="+7 ..." />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Email</label>
                <input value={m.email || ''} onChange={(e) => updateItem(i, { email: e.target.value })}
                  className="w-full px-2 py-1.5 border rounded text-sm" placeholder="email@..." />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
