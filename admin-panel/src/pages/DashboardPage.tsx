import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import StatusBadge from '../components/ui/StatusBadge';
import { useLanguage } from '../i18n/LanguageContext';
import { languages } from '../i18n/translations';

export default function DashboardPage() {
  const [health, setHealth] = useState<any>(null);
  const [kbStats, setKbStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { lang, setLang, t } = useLanguage();

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

  if (loading) return <div className="text-gray-500">{t('common.loading')}</div>;

  const isOnline = health?.status !== 'offline';

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{t('dashboard.title')}</h2>

        {/* Language selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{t('dashboard.language')}:</span>
          <div className="flex gap-1">
            {languages.map((l) => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                title={l.name}
                className={`px-2 py-1 rounded text-sm transition-colors ${
                  lang === l.code
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {l.flag} {l.code.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-sm font-medium text-gray-500 mb-2">{t('dashboard.appStatus')}</h3>
          <StatusBadge status={isOnline ? 'online' : 'offline'} label={isOnline ? t('dashboard.online') : t('dashboard.offline')} />
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-sm font-medium text-gray-500 mb-2">{t('dashboard.faqFiles')}</h3>
          <p className="text-2xl font-bold text-gray-900">{kbStats?.faqCount ?? '-'}</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-sm font-medium text-gray-500 mb-2">{t('dashboard.dialogFiles')}</h3>
          <p className="text-2xl font-bold text-gray-900">{kbStats?.dialogCount ?? '-'}</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-sm font-medium text-gray-500 mb-2">{t('dashboard.policyFiles')}</h3>
          <p className="text-2xl font-bold text-gray-900">{kbStats?.policyCount ?? '-'}</p>
        </div>
      </div>

      <h3 className="text-lg font-semibold text-gray-800 mb-3">{t('dashboard.quickActions')}</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Link to="/config" className="block p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
          <h4 className="font-medium text-gray-800">{t('nav.config')}</h4>
          <p className="text-sm text-gray-500 mt-1">{t('dashboard.configDesc')}</p>
        </Link>
        <Link to="/knowledge" className="block p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
          <h4 className="font-medium text-gray-800">{t('nav.knowledge')}</h4>
          <p className="text-sm text-gray-500 mt-1">{t('dashboard.knowledgeDesc')}</p>
        </Link>
        <Link to="/dialogs" className="block p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
          <h4 className="font-medium text-gray-800">{t('nav.dialogs')}</h4>
          <p className="text-sm text-gray-500 mt-1">{t('dashboard.dialogsDesc')}</p>
        </Link>
      </div>

      {isOnline && health && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">{t('dashboard.appDetails')}</h3>
          <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-auto max-h-64">
            {JSON.stringify(health, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
