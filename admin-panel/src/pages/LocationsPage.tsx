import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import { useToast } from '../components/ui/Toast';

interface Location {
  id: string;
  name: string;
  active: boolean;
}

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/locations');
      setLocations(res.data);
    } catch (err: any) {
      toast('error', err.message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      const res = await api.post('/admin/locations', { name: newName.trim() });
      setLocations([...locations, res.data]);
      setNewName('');
      toast('success', 'Объект добавлен');
    } catch (err: any) {
      toast('error', err.response?.data?.error || err.message);
    } finally {
      setAdding(false);
    }
  };

  const handleToggleActive = async (id: string) => {
    setSaving(id);
    try {
      const res = await api.patch(`/admin/locations/${id}/toggle-active`);
      setLocations(locations.map(l => l.id === id ? res.data : l));
      toast('success', res.data.active ? 'Объект активирован' : 'Объект в архиве');
    } catch (err: any) {
      toast('error', err.message);
    } finally {
      setSaving(null);
    }
  };

  const startEdit = (loc: Location) => {
    setEditingId(loc.id);
    setEditName(loc.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    setSaving(editingId);
    try {
      const res = await api.put(`/admin/locations/${editingId}`, { name: editName.trim() });
      setLocations(locations.map(l => l.id === editingId ? res.data : l));
      setEditingId(null);
      setEditName('');
      toast('success', 'Объект обновлён');
    } catch (err: any) {
      toast('error', err.message);
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return <div className="text-gray-500">Загрузка...</div>;
  }

  return (
    <div className="max-w-3xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Объекты</h2>
      </div>

      {/* Добавить объект */}
      <div className="flex gap-2 items-center mb-6">
        <input
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="Название нового объекта..."
          className="flex-1 px-4 py-2 border rounded-lg text-sm"
        />
        <button
          onClick={handleAdd}
          disabled={adding || !newName.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {adding ? '...' : 'Добавить'}
        </button>
      </div>

      {/* Таблица */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Название</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Активен</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {locations.map(loc => {
              const isEditing = editingId === loc.id;
              const isActive = loc.active !== false;

              return (
                <tr key={loc.id} className={isActive ? 'hover:bg-gray-50' : 'bg-gray-100 opacity-60'}>
                  <td className="px-4 py-3 text-sm text-gray-500 font-mono">{loc.id}</td>
                  <td className="px-4 py-3 text-sm">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleSaveEdit();
                          if (e.key === 'Escape') cancelEdit();
                        }}
                        className="px-2 py-1 border rounded text-sm w-full"
                        autoFocus
                      />
                    ) : (
                      <span className="font-medium">{loc.name}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggleActive(loc.id)}
                      disabled={saving === loc.id}
                      title={isActive ? 'В архив' : 'Активировать'}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
                        isActive ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          isActive ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isEditing ? (
                      <div className="space-x-1">
                        <button
                          onClick={handleSaveEdit}
                          disabled={saving === loc.id}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                        >
                          {saving === loc.id ? '...' : '✓'}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-3 py-1 bg-gray-400 text-white text-sm rounded hover:bg-gray-500"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit(loc)}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                      >
                        ✎
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}

            {locations.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                  Нет объектов. Добавьте первый выше.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-gray-400">
        Медиа-файлы (фото, видео, презентации) настраиваются на странице «Медиа».
      </p>
    </div>
  );
}
