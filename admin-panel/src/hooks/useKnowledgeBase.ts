import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';

export function useKnowledgeBase<T>(endpoint: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/knowledge/${endpoint}`);
      setData(res.data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => { fetch(); }, [fetch]);

  const save = useCallback(async (newData: T) => {
    setSaving(true);
    try {
      await api.put(`/knowledge/${endpoint}`, newData);
      setData(newData);
      setError(null);
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setSaving(false);
    }
  }, [endpoint]);

  return { data, setData, loading, saving, error, save, refetch: fetch };
}
