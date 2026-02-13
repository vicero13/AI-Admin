import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import { useToast } from '../components/ui/Toast';
import ObjectMediaCard from '../components/media/ObjectMediaCard';
import OfficeMediaCard from '../components/media/OfficeMediaCard';
import type { ObjectMedia } from '../components/media/ObjectMediaCard';
import type { OfficeMedia } from '../components/media/OfficeMediaCard';

interface MediaConfig {
  enabled: boolean;
  basePath: string;
  objects: Record<string, ObjectMedia>;
  offices: Record<string, OfficeMedia>;
}

interface Office {
  id: string;
  locationId: string;
  number: string;
}

interface Location {
  id: string;
  name: string;
}

export default function MediaPage() {
  const [config, setConfig] = useState<MediaConfig | null>(null);
  const [offices, setOffices] = useState<Office[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingObject, setSavingObject] = useState<string | null>(null);
  const [savingOffice, setSavingOffice] = useState<string | null>(null);
  const [tab, setTab] = useState<'objects' | 'offices'>('objects');
  const [addOfficeId, setAddOfficeId] = useState('');
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [mediaRes, officesRes, locationsRes] = await Promise.all([
        api.get('/admin/media'),
        api.get('/admin/offices'),
        api.get('/admin/offices/locations'),
      ]);
      setConfig(mediaRes.data);
      setOffices(officesRes.data);
      setLocations(locationsRes.data);
    } catch (err: any) {
      toast('error', err.message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleEnabled = async () => {
    if (!config) return;
    try {
      const res = await api.patch('/admin/media/enabled', { enabled: !config.enabled });
      setConfig(res.data);
      toast('success', config.enabled ? 'Медиа выключены' : 'Медиа включены');
    } catch (err: any) {
      toast('error', err.message);
    }
  };

  const saveObjectMedia = async (locationId: string, data: ObjectMedia) => {
    setSavingObject(locationId);
    try {
      const res = await api.put(`/admin/media/objects/${locationId}`, data);
      setConfig(res.data);
      toast('success', `${data.name} — медиа сохранены`);
    } catch (err: any) {
      toast('error', err.message);
    } finally {
      setSavingObject(null);
    }
  };

  const saveOfficeMedia = async (officeId: string, data: OfficeMedia) => {
    setSavingOffice(officeId);
    try {
      const res = await api.put(`/admin/media/offices/${officeId}`, data);
      setConfig(res.data);
      toast('success', `${data.name} — медиа сохранены`);
    } catch (err: any) {
      toast('error', err.message);
    } finally {
      setSavingOffice(null);
    }
  };

  const deleteOfficeMedia = async (officeId: string) => {
    try {
      const res = await api.delete(`/admin/media/offices/${officeId}`);
      setConfig(res.data);
      toast('success', 'Медиа офиса удалены');
    } catch (err: any) {
      toast('error', err.message);
    }
  };

  const addOfficeMedia = () => {
    if (!addOfficeId || !config) return;
    const office = offices.find((o) => o.id === addOfficeId);
    if (!office) return;

    const locationName = locations.find((l) => l.id === office.locationId)?.name || office.locationId;
    const name = `${locationName} — ${office.number}`;

    const newConfig = { ...config };
    newConfig.offices = {
      ...newConfig.offices,
      [addOfficeId]: { name, address: '', photos: [], videos: [], keywords: [] },
    };
    setConfig(newConfig);
    setAddOfficeId('');
  };

  const getLocationName = (locationId: string) =>
    locations.find((l) => l.id === locationId)?.name || locationId;

  // Offices that don't have media yet
  const officesWithoutMedia = offices.filter(
    (o) => !config?.offices[o.id]
  );

  if (loading || !config) {
    return <div className="text-gray-500">Загрузка...</div>;
  }

  return (
    <div className="max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Медиа</h2>
        <button
          onClick={toggleEnabled}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            config.enabled
              ? 'bg-green-100 text-green-800 hover:bg-green-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {config.enabled ? 'Медиа включены' : 'Медиа выключены'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => setTab('objects')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            tab === 'objects' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Объекты ({Object.keys(config.objects).length})
        </button>
        <button
          onClick={() => setTab('offices')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            tab === 'offices' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Офисы ({Object.keys(config.offices).length})
        </button>
      </div>

      {/* Objects tab */}
      {tab === 'objects' && (
        <div className="space-y-4">
          {Object.entries(config.objects).map(([locationId, data]) => (
            <ObjectMediaCard
              key={locationId}
              locationId={locationId}
              data={data}
              saving={savingObject === locationId}
              onSave={saveObjectMedia}
            />
          ))}
        </div>
      )}

      {/* Offices tab */}
      {tab === 'offices' && (
        <div className="space-y-4">
          {/* Add office media */}
          {officesWithoutMedia.length > 0 && (
            <div className="flex gap-2 items-center">
              <select
                value={addOfficeId}
                onChange={(e) => setAddOfficeId(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">Выберите офис...</option>
                {officesWithoutMedia.map((o) => (
                  <option key={o.id} value={o.id}>
                    {getLocationName(o.locationId)} — {o.number}
                  </option>
                ))}
              </select>
              <button
                onClick={addOfficeMedia}
                disabled={!addOfficeId}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Добавить медиа
              </button>
            </div>
          )}

          {Object.keys(config.offices).length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Нет медиа для офисов. Выберите офис выше, чтобы добавить фотографии.
            </div>
          ) : (
            Object.entries(config.offices).map(([officeId, data]) => (
              <OfficeMediaCard
                key={officeId}
                officeId={officeId}
                data={data}
                saving={savingOffice === officeId}
                onSave={saveOfficeMedia}
                onDelete={deleteOfficeMedia}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
