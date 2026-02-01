import { useState, useEffect } from 'react';
import api from '../api/client';
import { useToast } from '../components/ui/Toast';
import type { Office } from '../types';

const emptyOffice: Omit<Office, 'id' | 'lastUpdated'> = {
  number: '',
  capacity: 1,
  pricePerMonth: 0,
  status: 'free',
  amenities: [],
  floor: 1,
  size: 0,
};

export default function OfficesPage() {
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Office | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const { toast } = useToast();

  const fetchOffices = async () => {
    try {
      const res = await api.get('/offices');
      setOffices(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast('error', 'Failed to load offices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOffices(); }, []);

  const save = async () => {
    if (!editing) return;
    try {
      if (isNew) {
        await api.post('/offices', editing);
        toast('success', 'Office created');
      } else {
        await api.put(`/offices/${editing.id}`, editing);
        toast('success', 'Office updated');
      }
      setEditing(null);
      setIsNew(false);
      fetchOffices();
    } catch (e: any) {
      toast('error', e.response?.data?.error || 'Failed to save');
    }
  };

  const remove = async (id: string) => {
    try {
      await api.delete(`/offices/${id}`);
      toast('success', 'Office deleted');
      fetchOffices();
    } catch {
      toast('error', 'Failed to delete');
    }
  };

  const filtered = filter === 'all' ? offices : offices.filter((o) => o.status === filter);
  const statusColors = { free: 'bg-green-100 text-green-800', rented: 'bg-red-100 text-red-800', maintenance: 'bg-yellow-100 text-yellow-800' };

  if (loading) return <div className="text-gray-500">Loading offices...</div>;

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Available Offices</h2>
        <button
          onClick={() => { setEditing({ ...emptyOffice, id: '', lastUpdated: 0 }); setIsNew(true); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          + Add Office
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        {['all', 'free', 'rented', 'maintenance'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 text-sm rounded-lg ${filter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)} ({s === 'all' ? offices.length : offices.filter((o) => o.status === s).length})
          </button>
        ))}
      </div>

      {editing && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 mb-6">
          <h3 className="font-medium text-gray-800 mb-4">{isNew ? 'New Office' : 'Edit Office'}</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Number</label>
              <input value={editing.number} onChange={(e) => setEditing({ ...editing, number: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Capacity</label>
              <input type="number" value={editing.capacity} onChange={(e) => setEditing({ ...editing, capacity: parseInt(e.target.value) || 1 })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Price/Month (RUB)</label>
              <input type="number" value={editing.pricePerMonth} onChange={(e) => setEditing({ ...editing, pricePerMonth: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Status</label>
              <select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as any })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                <option value="free">Free</option>
                <option value="rented">Rented</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Floor</label>
              <input type="number" value={editing.floor} onChange={(e) => setEditing({ ...editing, floor: parseInt(e.target.value) || 1 })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Size (sqm)</label>
              <input type="number" value={editing.size} onChange={(e) => setEditing({ ...editing, size: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-sm text-gray-700 mb-1">Notes</label>
            <input value={editing.notes || ''} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={save} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Save</button>
            <button onClick={() => { setEditing(null); setIsNew(false); }} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Number</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Capacity</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Price/Mo</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Floor</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Size</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No offices found</td></tr>
            ) : (
              filtered.map((o) => (
                <tr key={o.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{o.number}</td>
                  <td className="px-4 py-3">{o.capacity}</td>
                  <td className="px-4 py-3">{o.pricePerMonth?.toLocaleString()} RUB</td>
                  <td className="px-4 py-3">{o.floor}</td>
                  <td className="px-4 py-3">{o.size} sqm</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${statusColors[o.status] || ''}`}>{o.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => { setEditing(o); setIsNew(false); }} className="text-blue-600 hover:text-blue-800 mr-2">Edit</button>
                    <button onClick={() => remove(o.id)} className="text-red-500 hover:text-red-700">Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
