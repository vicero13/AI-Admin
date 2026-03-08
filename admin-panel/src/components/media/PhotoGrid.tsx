import type { MediaItem } from './MediaItemRow';

interface PhotoGridProps {
  items: MediaItem[];
  onDelete: (index: number) => void;
}

function getThumbUrl(item: MediaItem): string | null {
  if (item.url) return item.url;
  if (item.filePath) return `/${item.filePath}`;
  return null;
}

export default function PhotoGrid({ items, onDelete }: PhotoGridProps) {
  if (items.length === 0) return null;

  return (
    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
      {items.map((item, i) => {
        const src = getThumbUrl(item);
        return (
          <div key={item.id} className="relative group aspect-square">
            {src ? (
              <img
                src={src}
                alt={item.caption || ''}
                className="w-full h-full object-cover rounded-lg border border-gray-200"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '';
                  (e.target as HTMLImageElement).className = 'w-full h-full rounded-lg border border-gray-200 bg-gray-100';
                }}
              />
            ) : (
              <div className="w-full h-full rounded-lg border border-gray-200 bg-gray-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
            {/* Delete button */}
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(i); }}
              className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
              title="Удалить"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {/* Caption overlay */}
            {item.caption && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-1 py-0.5 rounded-b-lg truncate">
                {item.caption}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
