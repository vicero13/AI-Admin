import { useState } from 'react';
import MediaItemRow from './MediaItemRow';
import FileUploader from './FileUploader';
import TagInput from '../ui/TagInput';
import type { MediaItem } from './MediaItemRow';

const genId = () => Math.random().toString(36).slice(2, 10);

interface OfficeMedia {
  name: string;
  address: string;
  photos: MediaItem[];
  videos: MediaItem[];
  keywords: string[];
}

interface OfficeMediaCardProps {
  officeId: string;
  data: OfficeMedia;
  saving: boolean;
  onSave: (officeId: string, data: OfficeMedia) => void;
  onDelete: (officeId: string) => void;
}

export default function OfficeMediaCard({ officeId, data, saving, onSave, onDelete }: OfficeMediaCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [local, setLocal] = useState<OfficeMedia>({ ...data, videos: data.videos || [] });
  const [dirty, setDirty] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const update = (patch: Partial<OfficeMedia>) => {
    setLocal((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  };

  const addPhoto = () => {
    update({ photos: [...local.photos, { id: genId(), type: 'photo', url: '', caption: '', tags: [] }] });
  };

  const updatePhoto = (index: number, item: MediaItem) => {
    const photos = [...local.photos];
    photos[index] = item;
    update({ photos });
  };

  const deletePhoto = (index: number) => {
    update({ photos: local.photos.filter((_, i) => i !== index) });
  };

  const addVideo = () => {
    update({ videos: [...local.videos, { id: genId(), type: 'video', url: '', caption: '', tags: [] }] });
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
    onSave(officeId, local);
    setDirty(false);
  };

  const mediaCount = local.photos.length + local.videos.length;

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-3 flex-1"
        >
          <h3 className="text-base font-semibold text-gray-900">{local.name || officeId}</h3>
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
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Delete button */}
        {deleteConfirm ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-red-600">Удалить?</span>
            <button onClick={() => onDelete(officeId)} className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700">Да</button>
            <button onClick={() => setDeleteConfirm(false)} className="px-2 py-1 bg-gray-400 text-white text-xs rounded hover:bg-gray-500">Нет</button>
          </div>
        ) : (
          <button
            onClick={() => setDeleteConfirm(true)}
            className="p-1 text-red-500 hover:text-red-700"
            title="Удалить медиа офиса"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

      {/* Content */}
      {expanded && (
        <div className="p-4 pt-0 space-y-4 border-t border-gray-100">
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

export type { OfficeMedia };
