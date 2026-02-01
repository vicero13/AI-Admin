import { useRef, useState, DragEvent } from 'react';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  accept?: string;
}

export default function FileUploader({ onFileSelect, accept = '.json,.csv,.txt,.xlsx,.xls' }: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFileSelect(file);
  };

  const handleChange = () => {
    const file = inputRef.current?.files?.[0];
    if (file) onFileSelect(file);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
        dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
      }`}
    >
      <input ref={inputRef} type="file" accept={accept} onChange={handleChange} className="hidden" />
      <div className="text-gray-500">
        <p className="text-lg font-medium">Drag & drop file here or click to select</p>
        <p className="text-sm mt-2">Supported formats: JSON, CSV, TXT, XLSX</p>
      </div>
    </div>
  );
}
