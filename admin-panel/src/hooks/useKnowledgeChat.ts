import { useState, useCallback } from 'react';
import api from '../api/client';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  changes?: any;
  hasChanges?: boolean;
  applied?: boolean;
}

export function useKnowledgeChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (text: string) => {
    setLoading(true);
    setError(null);

    // Add user message
    const userMsg: ChatMessage = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await api.post('/knowledge/chat/message', {
        message: text,
        sessionId: 'default',
      });

      const { response, changes, hasChanges } = res.data;

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: response,
        changes: hasChanges ? changes : undefined,
        hasChanges: hasChanges || false,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
      const errorMsg: ChatMessage = {
        role: 'assistant',
        content: `Ошибка: ${err.response?.data?.error || err.message}`,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }, []);

  const applyChanges = useCallback(async (messageIndex: number) => {
    const msg = messages[messageIndex];
    if (!msg?.changes?.changes) return;

    setApplying(true);
    setError(null);

    try {
      const res = await api.post('/knowledge/chat/apply', {
        changes: msg.changes.changes,
      });

      // Mark message as applied
      setMessages((prev) =>
        prev.map((m, i) =>
          i === messageIndex ? { ...m, applied: true } : m
        )
      );

      // Add system confirmation
      const confirmMsg: ChatMessage = {
        role: 'assistant',
        content: res.data.message || 'Изменения применены.',
      };
      setMessages((prev) => [...prev, confirmMsg]);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setApplying(false);
    }
  }, [messages]);

  const clearChat = useCallback(async () => {
    try {
      await api.post('/knowledge/chat/clear', { sessionId: 'default' });
    } catch {
      // ignore
    }
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    loading,
    applying,
    error,
    sendMessage,
    applyChanges,
    clearChat,
  };
}
