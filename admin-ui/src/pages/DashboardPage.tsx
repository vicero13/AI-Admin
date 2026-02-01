import { useState, useEffect } from 'react';
import api from '../api/client';
import StatusBadge from '../components/ui/StatusBadge';

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/stats').then((res) => {
      setStats(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-500">Loading dashboard...</div>;

  const metrics = stats?.metrics || {};
  const kb = stats?.knowledgeBase || {};

  return (
    <div className="max-w-5xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h2>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">System Status</p>
          <div className="mt-2">
            <StatusBadge status="online" label="Running" />
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Total Conversations</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{metrics.totalConversations || 0}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Active Conversations</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{metrics.activeConversations || 0}</p>
        </div>
      </div>

      <h3 className="text-lg font-semibold text-gray-800 mb-3">Knowledge Base</h3>
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'FAQ Items', value: kb.faqCount || kb.totalItems || 0 },
          { label: 'Services', value: kb.servicesCount || 0 },
          { label: 'Policies', value: kb.policiesCount || 0 },
          { label: 'Dialogs', value: kb.dialogsCount || 0 },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500">{item.label}</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{item.value}</p>
          </div>
        ))}
      </div>

      {stats?.handoffs && (
        <>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Handoffs</h3>
          <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100">
            <pre className="text-sm text-gray-600 overflow-auto">{JSON.stringify(stats.handoffs, null, 2)}</pre>
          </div>
        </>
      )}
    </div>
  );
}
