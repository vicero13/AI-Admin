import type { MediaItem } from './MediaItemRow';

interface VideoGridProps {
  items: MediaItem[];
  onDelete: (index: number) => void;
}

function getVideoLabel(item: MediaItem): string {
  if (item.caption) return item.caption;
  if (item.filePath) {
    const parts = item.filePath.split('/');
    return parts[parts.length - 1];
  }
  if (item.url) return item.url.split('/').pop() || 'Video';
  return 'Video';
}

export default function VideoGrid({ items, onDelete }: VideoGridProps) {
  if (items.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {items.map((item, i) => (
        <div key={item.id} className="relative group flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
          <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="text-xs text-gray-600 truncate flex-1">{getVideoLabel(item)}</span>
          <button
            onClick={() => onDelete(i)}
            className="w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 flex-shrink-0"
            title="Удалить"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
