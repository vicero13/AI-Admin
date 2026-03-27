import { useState } from 'react';
import { useDialogUpload } from '../hooks/useDialogUpload';
import { useToast } from '../components/ui/Toast';
import { useTranslation } from '../i18n/useTranslation';
import FileUploader from '../components/dialogs/FileUploader';
import DialogPreview from '../components/dialogs/DialogPreview';
import type { DialogExample } from '../types';

export default function DialogUploadPage() {
  const { preview, uploading, importing, error, upload, importDialogs, reset } = useDialogUpload();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [dialogs, setDialogs] = useState<DialogExample[]>([]);
  const [importResult, setImportResult] = useState<string | null>(null);

  const handleFileSelect = async (file: File) => {
    setImportResult(null);
    const result = await upload(file);
    if (result) {
      setDialogs(result);
      toast('info', `${t('dialogs.parsed')} ${result.length}`);
    } else {
      toast('error', t('dialogs.parseFailed'));
    }
  };

  const handleRemove = (index: number) => {
    setDialogs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleImport = async () => {
    if (dialogs.length === 0) return;
    const result = await importDialogs(dialogs);
    if (result) {
      setImportResult(`${t('dialogs.imported')} ${result.added}. Total: ${result.total}.`);
      setDialogs([]);
      toast('success', `${t('dialogs.imported')} ${result.added}`);
    } else {
      toast('error', t('dialogs.importFailed'));
    }
  };

  return (
    <div className="max-w-4xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('dialogs.title')}</h2>
      <p className="text-sm text-gray-500 mb-4">
        {t('dialogs.description')}
      </p>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
      {importResult && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm">{importResult}</div>}

      {dialogs.length === 0 && !uploading && (
        <FileUploader onFileSelect={handleFileSelect} />
      )}

      {uploading && <div className="text-gray-500 py-8 text-center">{t('dialogs.parsing')}</div>}

      {dialogs.length > 0 && (
        <>
          <DialogPreview dialogs={dialogs} onRemove={handleRemove} />
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleImport}
              disabled={importing || dialogs.length === 0}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {importing ? '...' : `${t('common.import')} ${dialogs.length}`}
            </button>
            <button
              onClick={() => { setDialogs([]); reset(); }}
              className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-200"
            >
              {t('common.cancel')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
