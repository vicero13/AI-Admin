interface MediaItem {
  id: string;
  type: 'photo' | 'video';
  url?: string;
  filePath?: string;
  caption?: string;
  tags: string[];
}

interface MediaItemRowProps {
  item: MediaItem;
  onChange: (item: MediaItem) => void;
  onDelete: () => void;
}

export default function MediaItemRow({ item, onChange, onDelete }: MediaItemRowProps) {
  return (
    <div className="flex items-start gap-2 p-2 bg-gray-50 rounded border border-gray-200">
      {/* Preview thumbnail for photos */}
      {item.type === 'photo' && item.url && (
        <img
          src={item.url}
          alt={item.caption || ''}
          className="w-16 h-16 object-cover rounded flex-shrink-0"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      )}
      {item.type === 'video' && (
        <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
          <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      )}

      <div className="flex-1 space-y-1">
        <input
          type="url"
          value={item.url || item.filePath || ''}
          onChange={(e) => onChange({ ...item, url: e.target.value, filePath: undefined })}
          placeholder={item.type === 'photo' ? 'URL фото' : 'URL видео'}
          className="w-full px-2 py-1 border rounded text-sm"
        />
        <input
          type="text"
          value={item.caption || ''}
          onChange={(e) => onChange({ ...item, caption: e.target.value })}
          placeholder="Подпись (необязательно)"
          className="w-full px-2 py-1 border rounded text-sm"
        />
      </div>

      <button
        onClick={onDelete}
        className="p-1 text-red-500 hover:text-red-700 flex-shrink-0"
        title="Удалить"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}

export type { MediaItem };
