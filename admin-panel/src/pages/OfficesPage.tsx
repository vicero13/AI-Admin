import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import { useToast } from '../components/ui/Toast';

interface Location {
  id: string;
  name: string;
}

interface Office {
  id: string;
  locationId: string;
  number: string;
  capacity: number;
  area: number;
  pricePerMonth: number;
  link?: string;
  availableFrom: string;
  status: 'free' | 'rented' | 'maintenance';
  notes?: string;
  lastUpdated: number;
}

const emptyOffice = (): Partial<Office> => ({
  locationId: 'sokol',
  number: '',
  capacity: 4,
  area: 0,
  pricePerMonth: 0,
  link: '',
  availableFrom: 'available',
  status: 'free',
  notes: '',
});

export default function OfficesPage() {
  const [offices, setOffices] = useState<Office[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Office>>({});
  const [newOffice, setNewOffice] = useState<Partial<Office> | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [officesRes, locationsRes] = await Promise.all([
        api.get('/admin/offices'),
        api.get('/admin/offices/locations'),
      ]);
      setOffices(officesRes.data);
      setLocations(locationsRes.data);
    } catch (err: any) {
      toast('error', err.message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async (office: Partial<Office>, isNew: boolean) => {
    const id = isNew ? 'new' : office.id;
    setSaving(id!);
    try {
      if (isNew) {
        const res = await api.post('/admin/offices', office);
        setOffices([...offices, res.data]);
        setNewOffice(null);
        toast('success', 'Офис добавлен');
      } else {
        const res = await api.put(`/admin/offices/${office.id}`, office);
        setOffices(offices.map(o => o.id === office.id ? res.data : o));
        setEditingId(null);
        setEditData({});
        toast('success', 'Офис обновлён');
      }
    } catch (err: any) {
      toast('error', err.message);
    } finally {
      setSaving(null);
    }
  };

  const handleDelete = async (id: string) => {
    setSaving(id);
    try {
      await api.delete(`/admin/offices/${id}`);
      setOffices(offices.filter(o => o.id !== id));
      setDeleteConfirm(null);
      toast('success', 'Офис удалён');
    } catch (err: any) {
      toast('error', err.message);
    } finally {
      setSaving(null);
    }
  };

  const startEdit = (office: Office) => {
    setEditingId(office.id);
    setEditData({ ...office });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const getLocationName = (locationId: string) => {
    return locations.find(l => l.id === locationId)?.name || locationId;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU').format(price) + ' ₽';
  };

  const formatDate = (dateStr: string) => {
    if (dateStr === 'available') return 'Свободен';
    try {
      return new Date(dateStr).toLocaleDateString('ru-RU');
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return <div className="text-gray-500">Загрузка...</div>;
  }

  return (
    <div className="max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Офисы</h2>
        <button
          onClick={() => setNewOffice(emptyOffice())}
          disabled={!!newOffice}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Добавить офис
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Объект</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">№ офиса</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Мест</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">м²</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Цена/мес</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ссылка</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Свободен</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {/* Новый офис */}
            {newOffice && (
              <OfficeRow
                office={newOffice}
                locations={locations}
                isEditing={true}
                isNew={true}
                saving={saving === 'new'}
                onChange={(field, value) => setNewOffice({ ...newOffice, [field]: value })}
                onSave={() => handleSave(newOffice, true)}
                onCancel={() => setNewOffice(null)}
                onDelete={() => {}}
                onEdit={() => {}}
                deleteConfirm={false}
                onDeleteConfirm={() => {}}
                getLocationName={getLocationName}
                formatPrice={formatPrice}
                formatDate={formatDate}
              />
            )}

            {/* Существующие офисы */}
            {offices.map(office => (
              <OfficeRow
                key={office.id}
                office={editingId === office.id ? editData : office}
                locations={locations}
                isEditing={editingId === office.id}
                isNew={false}
                saving={saving === office.id}
                onChange={(field, value) => setEditData({ ...editData, [field]: value })}
                onSave={() => handleSave(editData, false)}
                onCancel={cancelEdit}
                onDelete={() => handleDelete(office.id)}
                onEdit={() => startEdit(office)}
                deleteConfirm={deleteConfirm === office.id}
                onDeleteConfirm={() => setDeleteConfirm(deleteConfirm === office.id ? null : office.id)}
                getLocationName={getLocationName}
                formatPrice={formatPrice}
                formatDate={formatDate}
              />
            ))}

            {offices.length === 0 && !newOffice && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  Нет офисов. Нажмите "Добавить офис" чтобы создать первый.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface OfficeRowProps {
  office: Partial<Office>;
  locations: Location[];
  isEditing: boolean;
  isNew: boolean;
  saving: boolean;
  onChange: (field: keyof Office, value: any) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onEdit: () => void;
  deleteConfirm: boolean;
  onDeleteConfirm: () => void;
  getLocationName: (id: string) => string;
  formatPrice: (price: number) => string;
  formatDate: (date: string) => string;
}

function OfficeRow({
  office,
  locations,
  isEditing,
  isNew,
  saving,
  onChange,
  onSave,
  onCancel,
  onDelete,
  onEdit,
  deleteConfirm,
  onDeleteConfirm,
  getLocationName,
  formatPrice,
  formatDate,
}: OfficeRowProps) {
  if (isEditing) {
    return (
      <tr className={isNew ? 'bg-blue-50' : 'bg-yellow-50'}>
        <td className="px-4 py-2">
          <select
            value={office.locationId || ''}
            onChange={e => onChange('locationId', e.target.value)}
            className="w-full px-2 py-1 border rounded text-sm"
          >
            {locations.map(loc => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        </td>
        <td className="px-4 py-2">
          <input
            type="text"
            value={office.number || ''}
            onChange={e => onChange('number', e.target.value)}
            placeholder="№311"
            className="w-20 px-2 py-1 border rounded text-sm"
          />
        </td>
        <td className="px-4 py-2">
          <input
            type="number"
            value={office.capacity || ''}
            onChange={e => onChange('capacity', parseInt(e.target.value) || 0)}
            className="w-16 px-2 py-1 border rounded text-sm"
          />
        </td>
        <td className="px-4 py-2">
          <input
            type="number"
            value={office.area || ''}
            onChange={e => onChange('area', parseFloat(e.target.value) || 0)}
            className="w-16 px-2 py-1 border rounded text-sm"
          />
        </td>
        <td className="px-4 py-2">
          <input
            type="number"
            value={office.pricePerMonth || ''}
            onChange={e => onChange('pricePerMonth', parseInt(e.target.value) || 0)}
            className="w-28 px-2 py-1 border rounded text-sm"
          />
        </td>
        <td className="px-4 py-2">
          <input
            type="url"
            value={office.link || ''}
            onChange={e => onChange('link', e.target.value)}
            placeholder="https://cian.ru/..."
            className="w-32 px-2 py-1 border rounded text-sm"
          />
        </td>
        <td className="px-4 py-2">
          <input
            type="date"
            value={office.availableFrom === 'available' ? '' : office.availableFrom || ''}
            onChange={e => onChange('availableFrom', e.target.value || 'available')}
            className="w-32 px-2 py-1 border rounded text-sm"
          />
        </td>
        <td className="px-4 py-2 text-right space-x-1">
          <button
            onClick={onSave}
            disabled={saving}
            className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? '...' : '✓'}
          </button>
          <button
            onClick={onCancel}
            disabled={saving}
            className="px-3 py-1 bg-gray-400 text-white text-sm rounded hover:bg-gray-500 disabled:opacity-50"
          >
            ✕
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3 text-sm">{getLocationName(office.locationId || '')}</td>
      <td className="px-4 py-3 text-sm font-medium">{office.number || '—'}</td>
      <td className="px-4 py-3 text-sm">{office.capacity}</td>
      <td className="px-4 py-3 text-sm">{office.area ? `${office.area} м²` : '—'}</td>
      <td className="px-4 py-3 text-sm font-medium">{formatPrice(office.pricePerMonth || 0)}</td>
      <td className="px-4 py-3 text-sm">
        {office.link ? (
          <a href={office.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            Ссылка
          </a>
        ) : '—'}
      </td>
      <td className="px-4 py-3 text-sm">
        <span className={office.availableFrom === 'available' ? 'text-green-600' : 'text-orange-600'}>
          {formatDate(office.availableFrom || 'available')}
        </span>
      </td>
      <td className="px-4 py-3 text-right space-x-1">
        {deleteConfirm ? (
          <>
            <span className="text-sm text-red-600 mr-2">Удалить?</span>
            <button
              onClick={onDelete}
              disabled={saving}
              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
            >
              Да
            </button>
            <button
              onClick={onDeleteConfirm}
              className="px-3 py-1 bg-gray-400 text-white text-sm rounded hover:bg-gray-500"
            >
              Нет
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onEdit}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              ✎
            </button>
            <button
              onClick={onDeleteConfirm}
              className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
            >
              ✕
            </button>
          </>
        )}
      </td>
    </tr>
  );
}
