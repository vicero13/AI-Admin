import { useState, useCallback } from 'react';
import api from '../api/client';

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = useCallback(() => {
    return !!localStorage.getItem('admin_token');
  }, []);

  const login = useCallback(async (password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/login', { password });
      localStorage.setItem('admin_token', res.data.token);
      return true;
    } catch (e: any) {
      setError(e.response?.data?.error || 'Login failed');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('admin_token');
    window.location.href = '/admin/login';
  }, []);

  return { login, logout, isAuthenticated, loading, error };
}
