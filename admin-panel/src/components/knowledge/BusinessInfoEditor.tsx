import { useState } from 'react';
import { useKnowledgeBase } from '../../hooks/useKnowledgeBase';
import { useToast } from '../ui/Toast';
import TagInput from '../ui/TagInput';

interface MeetingRoom {
  capacity: number;
  description: string;
}

interface LocationInfo {
  id: string;
  name: string;
  shortName: string;
  subtitle: string;
  metro: string;
  metroLine: string;
  address: string;
  description: string;
  buildingClass: string;
  features: string[];
  parking: { description: string };
  meetingRooms: MeetingRoom[];
  meetingRoomsNote: string;
  administrator: string;
  taxation: string;
  legalAddress?: string;
  internetExtra?: string;
  pricePerSeat?: number;
  websiteUrl?: string;
  wholeHouse?: string;
  matterportTour?: string;
}

interface BusinessInfo {
  name: string;
  type: string;
  description: string;
  tagline: string;
  contacts: { phone: string; email: string; website: string };
  locations: LocationInfo[];
  commonFeatures: string[];
  includedInPrice: string[];
  pricing: { minPricePerSeat: number; currency: string; period: string };
  contractTerms: { deposit: string; duration: string; earlyTermination: string };
  ownershipForm: string;
  brokerCommission: string;
}

function Section({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-lg">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-3 hover:bg-gray-50">
        <span className="text-sm font-semibold text-gray-800">{title}</span>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="p-3 pt-0 space-y-3">{children}</div>}
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', multiline = false }: {
  label: string; value: string | number; onChange: (v: string) => void; type?: string; multiline?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3}
          className="w-full px-3 py-2 border rounded-lg text-sm" />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg text-sm" />
      )}
    </div>
  );
}

function LocationEditor({ loc, onChange }: { loc: LocationInfo; onChange: (loc: LocationInfo) => void }) {
  const [expanded, setExpanded] = useState(false);
  const upd = (patch: Partial<LocationInfo>) => onChange({ ...loc, ...patch });

  return (
    <div className="border border-gray-200 rounded-lg">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between p-3 hover:bg-gray-50">
        <span className="text-sm font-medium text-gray-800">{loc.name} ({loc.id})</span>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expanded && (
        <div className="p-3 pt-0 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="ID" value={loc.id} onChange={(v) => upd({ id: v })} />
            <Field label="Название" value={loc.name} onChange={(v) => upd({ name: v })} />
            <Field label="Краткое имя" value={loc.shortName} onChange={(v) => upd({ shortName: v })} />
            <Field label="Подзаголовок" value={loc.subtitle} onChange={(v) => upd({ subtitle: v })} />
          </div>
          <Field label="Адрес" value={loc.address} onChange={(v) => upd({ address: v })} />
          <Field label="Метро" value={loc.metro} onChange={(v) => upd({ metro: v })} />
          <Field label="Линия метро" value={loc.metroLine} onChange={(v) => upd({ metroLine: v })} />
          <Field label="Описание" value={loc.description} onChange={(v) => upd({ description: v })} multiline />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Класс здания" value={loc.buildingClass || ''} onChange={(v) => upd({ buildingClass: v })} />
            <Field label="Цена за место" value={loc.pricePerSeat || ''} onChange={(v) => upd({ pricePerSeat: Number(v) || undefined })} type="number" />
          </div>
          <TagInput label="Особенности" tags={loc.features} onChange={(features) => upd({ features })} />
          <Field label="Парковка" value={loc.parking?.description || ''} onChange={(v) => upd({ parking: { description: v } })} multiline />
          <Field label="Переговорные (примечание)" value={loc.meetingRoomsNote || ''} onChange={(v) => upd({ meetingRoomsNote: v })} />
          <Field label="Администратор" value={loc.administrator || ''} onChange={(v) => upd({ administrator: v })} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Налогообложение" value={loc.taxation || ''} onChange={(v) => upd({ taxation: v })} />
            <Field label="Юр. адрес" value={loc.legalAddress || ''} onChange={(v) => upd({ legalAddress: v })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Сайт" value={loc.websiteUrl || ''} onChange={(v) => upd({ websiteUrl: v })} />
            <Field label="3D-тур Matterport" value={loc.matterportTour || ''} onChange={(v) => upd({ matterportTour: v })} />
          </div>
          <Field label="Интернет доп." value={loc.internetExtra || ''} onChange={(v) => upd({ internetExtra: v })} />
          <Field label="Целый дом" value={loc.wholeHouse || ''} onChange={(v) => upd({ wholeHouse: v })} multiline />

          {/* Meeting rooms */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Переговорные комнаты</label>
            <div className="space-y-2">
              {loc.meetingRooms.map((room, ri) => (
                <div key={ri} className="flex items-center gap-2">
                  <input type="number" value={room.capacity} className="w-20 px-2 py-1 border rounded text-sm"
                    onChange={(e) => {
                      const rooms = [...loc.meetingRooms];
                      rooms[ri] = { ...rooms[ri], capacity: Number(e.target.value) };
                      upd({ meetingRooms: rooms });
                    }}
                  />
                  <input value={room.description} className="flex-1 px-2 py-1 border rounded text-sm"
                    onChange={(e) => {
                      const rooms = [...loc.meetingRooms];
                      rooms[ri] = { ...rooms[ri], description: e.target.value };
                      upd({ meetingRooms: rooms });
                    }}
                  />
                  <button onClick={() => upd({ meetingRooms: loc.meetingRooms.filter((_, i) => i !== ri) })}
                    className="text-red-500 hover:text-red-700 text-sm">✕</button>
                </div>
              ))}
              <button onClick={() => upd({ meetingRooms: [...loc.meetingRooms, { capacity: 4, description: '' }] })}
                className="text-sm text-blue-600 hover:text-blue-800">+ Добавить переговорную</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BusinessInfoEditor() {
  const { data, loading, saving, error, save } = useKnowledgeBase<BusinessInfo>('business-info');
  const [local, setLocal] = useState<BusinessInfo | null>(null);
  const [dirty, setDirty] = useState(false);
  const { toast } = useToast();

  // Sync loaded data
  if (data && !local) setLocal({ ...data });

  if (loading) return <div className="text-gray-500">Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!local) return null;

  const upd = (patch: Partial<BusinessInfo>) => {
    setLocal((prev) => prev ? { ...prev, ...patch } : prev);
    setDirty(true);
  };

  const handleSave = async () => {
    if (!local) return;
    const ok = await save(local);
    if (ok) { setDirty(false); toast('success', 'Business Info saved'); }
    else toast('error', 'Failed to save');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-gray-800">business-info.json</h3>
          {dirty && <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full">не сохранено</span>}
        </div>
        <button onClick={handleSave} disabled={saving || !dirty}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <Section title="Общая информация" defaultOpen>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Название" value={local.name} onChange={(v) => upd({ name: v })} />
          <Field label="Тип" value={local.type} onChange={(v) => upd({ type: v })} />
        </div>
        <Field label="Описание" value={local.description} onChange={(v) => upd({ description: v })} multiline />
        <Field label="Слоган" value={local.tagline} onChange={(v) => upd({ tagline: v })} multiline />
      </Section>

      <Section title="Контакты" defaultOpen>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Телефон" value={local.contacts.phone} onChange={(v) => upd({ contacts: { ...local.contacts, phone: v } })} />
          <Field label="Email" value={local.contacts.email} onChange={(v) => upd({ contacts: { ...local.contacts, email: v } })} />
          <Field label="Сайт" value={local.contacts.website} onChange={(v) => upd({ contacts: { ...local.contacts, website: v } })} />
        </div>
      </Section>

      <Section title="Цены и условия">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Мин. цена за место" value={local.pricing?.minPricePerSeat || ''} onChange={(v) => upd({ pricing: { ...local.pricing, minPricePerSeat: Number(v) } })} type="number" />
          <Field label="Валюта" value={local.pricing?.currency || ''} onChange={(v) => upd({ pricing: { ...local.pricing, currency: v } })} />
          <Field label="Период" value={local.pricing?.period || ''} onChange={(v) => upd({ pricing: { ...local.pricing, period: v } })} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Депозит" value={local.contractTerms?.deposit || ''} onChange={(v) => upd({ contractTerms: { ...local.contractTerms, deposit: v } })} />
          <Field label="Срок договора" value={local.contractTerms?.duration || ''} onChange={(v) => upd({ contractTerms: { ...local.contractTerms, duration: v } })} />
          <Field label="Досрочное расторжение" value={local.contractTerms?.earlyTermination || ''} onChange={(v) => upd({ contractTerms: { ...local.contractTerms, earlyTermination: v } })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Форма собственности" value={local.ownershipForm || ''} onChange={(v) => upd({ ownershipForm: v })} />
          <Field label="Комиссия брокерам" value={local.brokerCommission || ''} onChange={(v) => upd({ brokerCommission: v })} />
        </div>
      </Section>

      <Section title="Включено">
        <TagInput label="Общие удобства" tags={local.commonFeatures || []} onChange={(commonFeatures) => upd({ commonFeatures })} />
        <TagInput label="Включено в стоимость" tags={local.includedInPrice || []} onChange={(includedInPrice) => upd({ includedInPrice })} />
      </Section>

      <Section title={`Локации (${local.locations?.length || 0})`}>
        <div className="space-y-3">
          {(local.locations || []).map((loc, i) => (
            <LocationEditor key={loc.id} loc={loc} onChange={(updated) => {
              const locs = [...local.locations];
              locs[i] = updated;
              upd({ locations: locs });
            }} />
          ))}
        </div>
      </Section>
    </div>
  );
}
