import { useState, useCallback } from 'react';
import api from '../api/client';
import type { DialogExample } from '../types';

export function useDialogUpload() {
  const [preview, setPreview] = useState<DialogExample[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (file: File, format?: string) => {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (format) formData.append('format', format);
      const { data } = await api.post('/dialogs/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPreview(data.dialogs);
      return data.dialogs as DialogExample[];
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
      return null;
    } finally {
      setUploading(false);
    }
  }, []);

  const importDialogs = useCallback(async (dialogs: DialogExample[]) => {
    setImporting(true);
    setError(null);
    try {
      const { data } = await api.post('/dialogs/import', { dialogs });
      setPreview(null);
      return data;
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
      return null;
    } finally {
      setImporting(false);
    }
  }, []);

  const reset = useCallback(() => {
    setPreview(null);
    setError(null);
  }, []);

  return { preview, uploading, importing, error, upload, importDialogs, reset };
}
