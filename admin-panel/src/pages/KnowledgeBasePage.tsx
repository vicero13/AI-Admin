import { useState } from 'react';
import BusinessInfoEditor from '../components/knowledge/BusinessInfoEditor';
import ServicesEditor from '../components/knowledge/ServicesEditor';
import TeamEditor from '../components/knowledge/TeamEditor';
import FAQEditor from '../components/knowledge/FAQEditor';
import PolicyEditor from '../components/knowledge/PolicyEditor';

const tabs = [
  { key: 'business', label: 'Business Info' },
  { key: 'services', label: 'Services' },
  { key: 'team', label: 'Team' },
  { key: 'faq', label: 'FAQ' },
  { key: 'policies', label: 'Policies' },
];

export default function KnowledgeBasePage() {
  const [tab, setTab] = useState('business');

  return (
    <div className="max-w-4xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Knowledge Base</h2>

      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'business' && <BusinessInfoEditor />}
      {tab === 'services' && <ServicesEditor />}
      {tab === 'team' && <TeamEditor />}
      {tab === 'faq' && <FAQEditor />}
      {tab === 'policies' && <PolicyEditor />}
    </div>
  );
}
