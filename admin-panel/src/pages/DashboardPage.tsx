import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import StatusBadge from '../components/ui/StatusBadge';

export default function DashboardPage() {
  const [health, setHealth] = useState<any>(null);
  const [kbStats, setKbStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/status/health').then((r) => r.data).catch(() => ({ status: 'offline' })),
      api.get('/status/knowledge-stats').then((r) => r.data).catch(() => null),
    ]).then(([h, kb]) => {
      setHealth(h);
      setKbStats(kb);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="text-gray-500">Loading dashboard...</div>;

  const isOnline = health?.status !== 'offline';

  return (
    <div className="max-w-4xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Main App Status</h3>
          <StatusBadge status={isOnline ? 'online' : 'offline'} label={isOnline ? 'Online' : 'Offline'} />
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-sm font-medium text-gray-500 mb-2">FAQ Files</h3>
          <p className="text-2xl font-bold text-gray-900">{kbStats?.faqCount ?? '-'}</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Dialog Files</h3>
          <p className="text-2xl font-bold text-gray-900">{kbStats?.dialogCount ?? '-'}</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Policy Files</h3>
          <p className="text-2xl font-bold text-gray-900">{kbStats?.policyCount ?? '-'}</p>
        </div>
      </div>

      <h3 className="text-lg font-semibold text-gray-800 mb-3">Quick Actions</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Link to="/config" className="block p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
          <h4 className="font-medium text-gray-800">Configuration</h4>
          <p className="text-sm text-gray-500 mt-1">Edit AI, personality, and system settings</p>
        </Link>
        <Link to="/knowledge" className="block p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
          <h4 className="font-medium text-gray-800">Knowledge Base</h4>
          <p className="text-sm text-gray-500 mt-1">Manage business info, services, FAQ</p>
        </Link>
        <Link to="/dialogs" className="block p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
          <h4 className="font-medium text-gray-800">Dialog Upload</h4>
          <p className="text-sm text-gray-500 mt-1">Import dialog examples in various formats</p>
        </Link>
      </div>

      {isOnline && health && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">App Details</h3>
          <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-auto max-h-64">
            {JSON.stringify(health, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
