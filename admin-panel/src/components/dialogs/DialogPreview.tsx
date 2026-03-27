import type { DialogExample } from '../../types';
import { useTranslation } from '../../i18n/useTranslation';

interface DialogPreviewProps {
  dialogs: DialogExample[];
  onRemove: (index: number) => void;
}

export default function DialogPreview({ dialogs, onRemove }: DialogPreviewProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">{t('dialogs.parsed').replace('{count}', String(dialogs.length))}</p>
      {dialogs.map((d, i) => (
        <div key={i} className="border border-gray-200 rounded-lg p-4 bg-white">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="font-medium text-gray-800">{d.situation}</h4>
              <span className="text-xs text-gray-500">
                {d.messages.length} msg | {d.clientType} | {d.outcome}
              </span>
            </div>
            <button onClick={() => onRemove(i)} className="text-red-400 hover:text-red-600 text-sm">{t('common.remove')}</button>
          </div>
          <div className="space-y-1.5">
            {d.messages.map((m, j) => (
              <div key={j} className={`text-sm px-3 py-1.5 rounded ${m.role === 'client' ? 'bg-gray-100' : 'bg-blue-50'}`}>
                <span className="font-medium text-xs text-gray-500">{m.role === 'client' ? t('dialogs.client') : t('dialogs.manager')}:</span>{' '}
                {m.text}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
