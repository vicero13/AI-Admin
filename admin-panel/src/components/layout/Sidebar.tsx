import { NavLink } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import type { TranslationKey } from '../../i18n/translations';

const links: { to: string; labelKey: TranslationKey }[] = [
  { to: '/dashboard', labelKey: 'nav.dashboard' },
  { to: '/locations', labelKey: 'nav.locations' },
  { to: '/offices', labelKey: 'nav.offices' },
  { to: '/media', labelKey: 'nav.media' },
  { to: '/config', labelKey: 'nav.config' },
  { to: '/knowledge', labelKey: 'nav.knowledge' },
  { to: '/dialogs', labelKey: 'nav.dialogs' },
];

export default function Sidebar() {
  const { t } = useLanguage();

  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-xl font-bold">{t('header.title')}</h1>
        <p className="text-xs text-gray-400 mt-1">{t('header.subtitle')}</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            {t(link.labelKey)}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
