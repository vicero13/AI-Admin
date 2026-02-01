import { useState, useEffect } from 'react';
import api from '../api/client';

export default function StatsPage() {
  const [stats, setStats] = useState<any>(null);
  const [faqUsage, setFaqUsage] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/stats').catch(() => ({ data: {} })),
      api.get('/stats/faq-usage').catch(() => ({ data: [] })),
    ]).then(([s, f]) => {
      setStats(s.data);
      setFaqUsage(Array.isArray(f.data) ? f.data : []);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="text-gray-500">Loading statistics...</div>;

  const metrics = stats?.metrics || {};
  const kb = stats?.knowledgeBase || {};

  return (
    <div className="max-w-5xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Statistics</h2>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Conversations', value: metrics.totalConversations || 0, color: 'text-blue-600' },
          { label: 'Active Conversations', value: metrics.activeConversations || 0, color: 'text-green-600' },
          { label: 'Total Handoffs', value: metrics.totalHandoffs || 0, color: 'text-orange-600' },
          { label: 'KB Items', value: kb.totalItems || 0, color: 'text-purple-600' },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500">{item.label}</p>
            <p className={`text-3xl font-bold ${item.color} mt-1`}>{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Top FAQ Questions</h3>
          {faqUsage.length === 0 ? (
            <p className="text-sm text-gray-400">No FAQ usage data available</p>
          ) : (
            <div className="space-y-2">
              {faqUsage.slice(0, 10).map((item: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 truncate flex-1 mr-4">{item.question}</span>
                  <span className="text-gray-400 text-xs font-mono">{item.popularity || 0}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">System Metrics</h3>
          <pre className="text-xs text-gray-600 overflow-auto max-h-[300px]">
            {JSON.stringify(metrics, null, 2)}
          </pre>
        </div>
      </div>

      {stats?.handoffs && (
        <div className="mt-6 bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Handoff Statistics</h3>
          <pre className="text-xs text-gray-600 overflow-auto max-h-[200px]">
            {JSON.stringify(stats.handoffs, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
