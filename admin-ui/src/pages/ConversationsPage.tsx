import { useState, useEffect } from 'react';
import api from '../api/client';
import { useToast } from '../components/ui/Toast';

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const { toast } = useToast();

  const limit = 20;

  const fetchConversations = async (p: number) => {
    setLoading(true);
    try {
      const res = await api.get('/conversations', { params: { page: p, limit } });
      setConversations(res.data.conversations || []);
      setTotal(res.data.total || 0);
    } catch {
      toast('error', 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations(page);
  }, [page]);

  const toggleExpand = async (id: string) => {
    if (expanded === id) {
      setExpanded(null);
      setMessages([]);
      return;
    }
    setExpanded(id);
    setLoadingMessages(true);
    try {
      const res = await api.get(`/conversations/${id}/messages`);
      setMessages(Array.isArray(res.data) ? res.data : []);
    } catch {
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const switchToAI = async (id: string) => {
    try {
      await api.post(`/conversations/${id}/ai-mode`);
      toast('success', `Conversation ${id} switched to AI mode`);
    } catch {
      toast('error', 'Failed to switch mode');
    }
  };

  const pages = Math.ceil(total / limit);

  return (
    <div className="max-w-5xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Conversations</h2>

      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : conversations.length === 0 ? (
        <div className="text-gray-400 py-12 text-center">No conversations found</div>
      ) : (
        <div className="space-y-2">
          {conversations.map((c) => (
            <div key={c.id || c.conversationId} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div
                onClick={() => toggleExpand(c.id || c.conversationId)}
                className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-gray-50"
              >
                <div className="flex items-center gap-4">
                  <span className="font-mono text-xs text-gray-400">{(c.id || c.conversationId || '').slice(0, 8)}</span>
                  <span className="text-sm text-gray-700">{c.userId || c.platform || 'Unknown'}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    c.mode === 'human' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {c.mode || 'ai'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {c.mode === 'human' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); switchToAI(c.id || c.conversationId); }}
                      className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      Switch to AI
                    </button>
                  )}
                  <span className="text-xs text-gray-400">{expanded === (c.id || c.conversationId) ? '▲' : '▼'}</span>
                </div>
              </div>
              {expanded === (c.id || c.conversationId) && (
                <div className="border-t px-5 py-3 bg-gray-50">
                  {loadingMessages ? (
                    <p className="text-sm text-gray-400">Loading messages...</p>
                  ) : messages.length === 0 ? (
                    <p className="text-sm text-gray-400">No messages</p>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-auto">
                      {messages.map((m: any, i: number) => (
                        <div key={i} className={`text-sm px-3 py-2 rounded ${
                          m.role === 'user' || m.role === 'client' ? 'bg-white border' : 'bg-blue-50'
                        }`}>
                          <span className="text-xs font-medium text-gray-500">{m.role}:</span> {m.content || m.text}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: Math.min(pages, 10) }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`px-3 py-1.5 text-sm rounded ${
                page === p ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
