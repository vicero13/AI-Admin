import { useState } from 'react';
import { useTranslation } from '../i18n/useTranslation';
import BusinessInfoEditor from '../components/knowledge/BusinessInfoEditor';
import ServicesEditor from '../components/knowledge/ServicesEditor';
import TeamEditor from '../components/knowledge/TeamEditor';
import FAQEditor from '../components/knowledge/FAQEditor';
import PolicyEditor from '../components/knowledge/PolicyEditor';
import KnowledgeChat from '../components/knowledge/KnowledgeChat';

const tabKeys = ['chat', 'business', 'services', 'team', 'faq', 'policies'] as const;
const tabTranslationKeys: Record<string, string> = {
  chat: 'knowledge.tabChat',
  business: 'knowledge.tabBusiness',
  services: 'knowledge.tabServices',
  team: 'knowledge.tabTeam',
  faq: 'knowledge.tabFaq',
  policies: 'knowledge.tabPolicies',
};

export default function KnowledgeBasePage() {
  const [tab, setTab] = useState('chat');
  const { t } = useTranslation();

  return (
    <div className="max-w-4xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('knowledge.title')}</h2>

      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {tabKeys.map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t(tabTranslationKeys[key] as any)}
          </button>
        ))}
      </div>

      {tab === 'chat' && <KnowledgeChat />}
      {tab === 'business' && <BusinessInfoEditor />}
      {tab === 'services' && <ServicesEditor />}
      {tab === 'team' && <TeamEditor />}
      {tab === 'faq' && <FAQEditor />}
      {tab === 'policies' && <PolicyEditor />}
    </div>
  );
}
