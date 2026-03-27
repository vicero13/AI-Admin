import { useTranslation } from '../../i18n/useTranslation';

export default function Header() {
  const { t } = useTranslation();

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center px-6">
      <p className="text-sm text-gray-500">
        {t('header.description')}
      </p>
    </header>
  );
}
