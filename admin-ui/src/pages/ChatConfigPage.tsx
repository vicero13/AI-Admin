import { useState, useRef, useEffect } from 'react';
import api from '../api/client';
import { useToast } from '../components/ui/Toast';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  changes?: any;
}

export default function ChatConfigPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMessage = input.trim();
    setInput('');

    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const res = await api.post('/chat-config/message', { message: userMessage });
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: res.data.response, changes: res.data.changes },
      ]);
    } catch (e: any) {
      toast('error', `Error: ${e.response?.data?.error || e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const applyChanges = async (changes: any) => {
    try {
      await api.post('/chat-config/apply', { changes: changes.changes });
      toast('success', 'Changes applied successfully!');
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Changes have been applied. Server may need restart for some changes to take effect.' },
      ]);
    } catch (e: any) {
      toast('error', `Failed to apply: ${e.response?.data?.error || e.message}`);
    }
  };

  const clearChat = async () => {
    await api.post('/chat-config/clear', {});
    setMessages([]);
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Chat Config</h2>
          <p className="text-sm text-gray-500">Use natural language to modify configuration</p>
        </div>
        {messages.length > 0 && (
          <button onClick={clearChat} className="text-sm text-gray-500 hover:text-gray-700">Clear chat</button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-[600px]">
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-400 mt-20">
              <p className="text-lg mb-2">Ask me to change configuration</p>
              <p className="text-sm">Example: "Change agent name to Maria" or "Increase max tokens to 1000"</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-xl px-4 py-3 ${
                msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'
              }`}>
                <div className="text-sm whitespace-pre-wrap">{msg.content.replace(/```json[\s\S]*?```/g, '[Config changes detected]')}</div>
                {msg.changes?.action === 'modify' && (
                  <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                    <p className="text-xs font-medium text-gray-600 mb-2">Proposed Changes:</p>
                    {msg.changes.changes?.map((c: any, j: number) => (
                      <div key={j} className="text-xs mb-1">
                        <span className="font-mono text-gray-500">{c.section}.{c.path}:</span>
                        <span className="text-red-500 line-through ml-1">{JSON.stringify(c.oldValue)}</span>
                        <span className="text-green-600 ml-1">{JSON.stringify(c.newValue)}</span>
                      </div>
                    ))}
                    <button
                      onClick={() => applyChanges(msg.changes)}
                      className="mt-2 px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                    >
                      Apply Changes
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-xl px-4 py-3 text-sm text-gray-500">Thinking...</div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t p-3 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type a config change request..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
