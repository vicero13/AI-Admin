import { useState } from 'react';
import { useKnowledgeBase } from '../../hooks/useKnowledgeBase';
import { useToast } from '../ui/Toast';
import TagInput from '../ui/TagInput';

interface PricingItem {
  amount: number;
  currency: string;
  unit: string;
  conditions: string;
}

interface ServiceEntry {
  serviceId: string;
  name: string;
  description: string;
  category: string;
  pricing: PricingItem[];
  available: boolean;
  features: string[];
  popular: boolean;
  tags: string[];
  metadata?: Record<string, string>;
}

const emptyService: ServiceEntry = {
  serviceId: '', name: '', description: '', category: 'workspace',
  pricing: [{ amount: 0, currency: 'RUB', unit: 'месяц', conditions: '' }],
  available: true, features: [], popular: false, tags: [], metadata: {},
};

function ServiceCard({ item, onChange, onDelete }: {
  item: ServiceEntry; onChange: (s: ServiceEntry) => void; onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const upd = (patch: Partial<ServiceEntry>) => onChange({ ...item, ...patch });

  return (
    <div className="border border-gray-200 rounded-lg">
      <div className="flex items-center justify-between p-3 hover:bg-gray-50">
        <button onClick={() => setExpanded(!expanded)} className="flex-1 text-left flex items-center gap-2">
          <svg className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${expanded ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          <span className="text-sm font-medium text-gray-800 truncate">{item.name || '(без названия)'}</span>
          <span className={`px-1.5 py-0.5 text-[10px] rounded flex-shrink-0 ${item.available ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
            {item.available ? 'Доступно' : 'Недоступно'}
          </span>
          <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded flex-shrink-0">{item.category}</span>
          {item.popular && <span className="px-1.5 py-0.5 bg-yellow-50 text-yellow-700 text-[10px] rounded flex-shrink-0">Popular</span>}
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
              <label className="block text-xs text-gray-500 mb-1">Service ID</label>
              <input value={item.serviceId} onChange={(e) => upd({ serviceId: e.target.value })}
                className="w-full px-2 py-1.5 border rounded text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Категория</label>
              <select value={item.category} onChange={(e) => upd({ category: e.target.value })}
                className="w-full px-2 py-1.5 border rounded text-sm">
                <option value="workspace">workspace</option>
                <option value="office">office</option>
                <option value="service">service</option>
              </select>
            </div>
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-1.5 text-xs text-gray-600">
                <input type="checkbox" checked={item.available} onChange={(e) => upd({ available: e.target.checked })} />
                Доступно
              </label>
              <label className="flex items-center gap-1.5 text-xs text-gray-600">
                <input type="checkbox" checked={item.popular} onChange={(e) => upd({ popular: e.target.checked })} />
                Popular
              </label>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Название</label>
            <input value={item.name} onChange={(e) => upd({ name: e.target.value })}
              className="w-full px-2 py-1.5 border rounded text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Описание</label>
            <textarea value={item.description} onChange={(e) => upd({ description: e.target.value })}
              rows={3} className="w-full px-2 py-1.5 border rounded text-sm" />
          </div>

          {/* Pricing */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Цены</label>
            <div className="space-y-2">
              {item.pricing.map((p, pi) => (
                <div key={pi} className="flex items-center gap-2">
                  <input type="number" value={p.amount} className="w-24 px-2 py-1 border rounded text-sm"
                    onChange={(e) => {
                      const pricing = [...item.pricing];
                      pricing[pi] = { ...pricing[pi], amount: Number(e.target.value) };
                      upd({ pricing });
                    }} />
                  <input value={p.currency} className="w-16 px-2 py-1 border rounded text-sm"
                    onChange={(e) => {
                      const pricing = [...item.pricing];
                      pricing[pi] = { ...pricing[pi], currency: e.target.value };
                      upd({ pricing });
                    }} />
                  <input value={p.unit} className="w-28 px-2 py-1 border rounded text-sm" placeholder="единица"
                    onChange={(e) => {
                      const pricing = [...item.pricing];
                      pricing[pi] = { ...pricing[pi], unit: e.target.value };
                      upd({ pricing });
                    }} />
                  <input value={p.conditions} className="flex-1 px-2 py-1 border rounded text-sm" placeholder="условия"
                    onChange={(e) => {
                      const pricing = [...item.pricing];
                      pricing[pi] = { ...pricing[pi], conditions: e.target.value };
                      upd({ pricing });
                    }} />
                  <button onClick={() => upd({ pricing: item.pricing.filter((_, i) => i !== pi) })}
                    className="text-red-500 hover:text-red-700 text-sm">✕</button>
                </div>
              ))}
              <button onClick={() => upd({ pricing: [...item.pricing, { amount: 0, currency: 'RUB', unit: 'месяц', conditions: '' }] })}
                className="text-xs text-blue-600 hover:text-blue-800">+ Добавить цену</button>
            </div>
          </div>

          <TagInput label="Особенности" tags={item.features} onChange={(features) => upd({ features })} />
          <TagInput label="Теги" tags={item.tags} onChange={(tags) => upd({ tags })} />

          {/* Metadata */}
          {item.metadata && Object.keys(item.metadata).length > 0 && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Метаданные</label>
              <div className="space-y-1">
                {Object.entries(item.metadata).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2">
                    <input value={k} className="w-32 px-2 py-1 border rounded text-sm bg-gray-50" readOnly />
                    <input value={v} className="flex-1 px-2 py-1 border rounded text-sm"
                      onChange={(e) => upd({ metadata: { ...item.metadata, [k]: e.target.value } })} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ServicesEditor() {
  const { data, loading, saving, error, save } = useKnowledgeBase<ServiceEntry[]>('services');
  const [local, setLocal] = useState<ServiceEntry[] | null>(null);
  const [dirty, setDirty] = useState(false);
  const { toast } = useToast();

  if (data && !local) setLocal([...data]);

  if (loading) return <div className="text-gray-500">Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!local) return null;

  const handleSave = async () => {
    const ok = await save(local);
    if (ok) { setDirty(false); toast('success', 'Services saved'); }
    else toast('error', 'Failed to save');
  };

  const updateItem = (index: number, item: ServiceEntry) => {
    const next = [...local];
    next[index] = item;
    setLocal(next);
    setDirty(true);
  };

  const deleteItem = (index: number) => {
    setLocal(local.filter((_, i) => i !== index));
    setDirty(true);
  };

  const addItem = () => {
    setLocal([...local, { ...emptyService, serviceId: `svc-${Date.now().toString(36)}` }]);
    setDirty(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-gray-800">services.json</h3>
          <span className="text-sm text-gray-500">({local.length} услуг)</span>
          {dirty && <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full">не сохранено</span>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={addItem} className="text-sm text-blue-600 hover:text-blue-800">+ Добавить услугу</button>
          <button onClick={handleSave} disabled={saving || !dirty}
            className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {local.map((item, i) => (
          <ServiceCard key={item.serviceId || i} item={item}
            onChange={(updated) => updateItem(i, updated)}
            onDelete={() => deleteItem(i)} />
        ))}
      </div>
    </div>
  );
}
