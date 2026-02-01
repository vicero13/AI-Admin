import type { DialogExample } from '../../types';

interface DialogPreviewProps {
  dialogs: DialogExample[];
  onRemove: (index: number) => void;
}

export default function DialogPreview({ dialogs, onRemove }: DialogPreviewProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">Parsed {dialogs.length} dialog(s). Review before importing:</p>
      {dialogs.map((d, i) => (
        <div key={i} className="border border-gray-200 rounded-lg p-4 bg-white">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="font-medium text-gray-800">{d.situation}</h4>
              <span className="text-xs text-gray-500">
                {d.messages.length} messages | {d.clientType} | {d.outcome}
              </span>
            </div>
            <button onClick={() => onRemove(i)} className="text-red-400 hover:text-red-600 text-sm">Remove</button>
          </div>
          <div className="space-y-1.5">
            {d.messages.map((m, j) => (
              <div key={j} className={`text-sm px-3 py-1.5 rounded ${m.role === 'client' ? 'bg-gray-100' : 'bg-blue-50'}`}>
                <span className="font-medium text-xs text-gray-500">{m.role === 'client' ? 'Client' : 'Manager'}:</span>{' '}
                {m.text}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
