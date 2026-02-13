import { useState } from 'react';
import MediaItemRow from './MediaItemRow';
import FileUploader from './FileUploader';
import TagInput from '../ui/TagInput';
import type { MediaItem } from './MediaItemRow';

const genId = () => Math.random().toString(36).slice(2, 10);

interface ObjectMedia {
  name: string;
  photos: MediaItem[];
  videos: MediaItem[];
  tour3d?: string;
  presentation?: string;
  cianLink?: string;
  keywords: string[];
}

interface ObjectMediaCardProps {
  locationId: string;
  data: ObjectMedia;
  saving: boolean;
  onSave: (locationId: string, data: ObjectMedia) => void;
}

export default function ObjectMediaCard({ locationId, data, saving, onSave }: ObjectMediaCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [local, setLocal] = useState<ObjectMedia>({ ...data });
  const [dirty, setDirty] = useState(false);

  const update = (patch: Partial<ObjectMedia>) => {
    setLocal((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  };

  const addPhoto = () => {
    update({ photos: [...local.photos, { id: genId(), type: 'photo', url: '', caption: '', tags: [] }] });
  };

  const addVideo = () => {
    update({ videos: [...local.videos, { id: genId(), type: 'video', url: '', caption: '', tags: [] }] });
  };

  const updatePhoto = (index: number, item: MediaItem) => {
    const photos = [...local.photos];
    photos[index] = item;
    update({ photos });
  };

  const deletePhoto = (index: number) => {
    update({ photos: local.photos.filter((_, i) => i !== index) });
  };

  const updateVideo = (index: number, item: MediaItem) => {
    const videos = [...local.videos];
    videos[index] = item;
    update({ videos });
  };

  const deleteVideo = (index: number) => {
    update({ videos: local.videos.filter((_, i) => i !== index) });
  };

  const handleSave = () => {
    onSave(locationId, local);
    setDirty(false);
  };

  const mediaCount = local.photos.length + local.videos.length + (local.presentation ? 1 : 0);

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
      >
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900">{local.name}</h3>
          {mediaCount > 0 && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
              {mediaCount} медиа
            </span>
          )}
          {dirty && (
            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full">
              не сохранено
            </span>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Content */}
      {expanded && (
        <div className="p-4 pt-0 space-y-6 border-t border-gray-100">
          {/* Photos */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-700">Фотографии</h4>
              <button onClick={addPhoto} className="text-sm text-blue-600 hover:text-blue-800">
                + Добавить фото
              </button>
            </div>
            <div className="space-y-2">
              {local.photos.map((photo, i) => (
                <MediaItemRow
                  key={photo.id}
                  item={photo}
                  onChange={(item) => updatePhoto(i, item)}
                  onDelete={() => deletePhoto(i)}
                />
              ))}
              <FileUploader
                accept="image/jpeg,image/png,image/webp"
                label="Перетащите фото или нажмите для загрузки"
                onUploaded={(result) => {
                  update({
                    photos: [
                      ...local.photos,
                      { id: genId(), type: 'photo', filePath: result.filePath, caption: '', tags: [] },
                    ],
                  });
                }}
              />
            </div>
          </section>

          {/* Videos */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-700">Видео</h4>
              <button onClick={addVideo} className="text-sm text-blue-600 hover:text-blue-800">
                + Добавить видео
              </button>
            </div>
            <div className="space-y-2">
              {local.videos.map((video, i) => (
                <MediaItemRow
                  key={video.id}
                  item={video}
                  onChange={(item) => updateVideo(i, item)}
                  onDelete={() => deleteVideo(i)}
                />
              ))}
              <FileUploader
                accept="video/mp4,video/quicktime,video/webm,video/x-matroska,.mp4,.mov,.webm,.mkv,.avi"
                label="Перетащите видео или нажмите для загрузки"
                onUploaded={(result) => {
                  update({
                    videos: [
                      ...local.videos,
                      { id: genId(), type: 'video', filePath: result.filePath, caption: '', tags: [] },
                    ],
                  });
                }}
              />
            </div>
          </section>

          {/* Links */}
          <section className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">Ссылки</h4>
            <div>
              <label className="block text-xs text-gray-500 mb-1">3D-тур</label>
              <input
                type="url"
                value={local.tour3d || ''}
                onChange={(e) => update({ tour3d: e.target.value })}
                placeholder="https://matterport.com/..."
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">ЦИАН</label>
              <input
                type="url"
                value={local.cianLink || ''}
                onChange={(e) => update({ cianLink: e.target.value })}
                placeholder="https://cian.ru/..."
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
          </section>

          {/* Presentation */}
          <section>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Презентация</h4>
            {local.presentation ? (
              <div className="flex items-center gap-2 p-2 bg-green-50 rounded border border-green-200">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm text-green-800 flex-1 truncate">{local.presentation}</span>
                <button
                  onClick={() => update({ presentation: '' })}
                  className="text-red-500 hover:text-red-700"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="url"
                  value={local.presentation || ''}
                  onChange={(e) => update({ presentation: e.target.value })}
                  placeholder="URL презентации или загрузите файл ниже"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
                <FileUploader
                  accept="application/pdf,.pptx"
                  label="Загрузить PDF / PPTX"
                  onUploaded={(result) => update({ presentation: result.filePath })}
                />
              </div>
            )}
          </section>

          {/* Keywords */}
          <section>
            <TagInput
              label="Ключевые слова"
              tags={local.keywords}
              onChange={(keywords) => update({ keywords })}
            />
          </section>

          {/* Save button */}
          <div className="pt-2 border-t border-gray-100">
            <button
              onClick={handleSave}
              disabled={saving || !dirty}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export type { ObjectMedia };
