import { useState, useRef } from 'react';
import api from '../../api/client';

interface UploadResult {
  filePath: string;
  filename: string;
}

interface FileUploaderProps {
  accept: string;
  label: string;
  multiple?: boolean;
  onUploaded: (result: UploadResult) => void;
  onMultiUploaded?: (results: UploadResult[]) => void;
}

export default function FileUploader({ accept, label, multiple, onUploaded, onMultiUploaded }: FileUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadOne = async (file: File): Promise<UploadResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/admin/media/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  };

  const handleFiles = async (files: FileList) => {
    if (files.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      if (files.length === 1) {
        const result = await uploadOne(files[0]);
        onUploaded(result);
      } else {
        const results: UploadResult[] = [];
        for (let i = 0; i < files.length; i++) {
          setProgress(`${i + 1} / ${files.length}`);
          const result = await uploadOne(files[i]);
          results.push(result);
        }
        setProgress('');
        if (onMultiUploaded) {
          onMultiUploaded(results);
        } else {
          results.forEach(r => onUploaded(r));
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setUploading(false);
      setProgress('');
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(e.target.files);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center hover:border-blue-400 transition-colors cursor-pointer"
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        className="hidden"
      />
      {uploading ? (
        <span className="text-sm text-gray-500">
          Загрузка{progress ? ` (${progress})` : ''}...
        </span>
      ) : (
        <span className="text-sm text-gray-500">{label}</span>
      )}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
