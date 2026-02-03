import { useState, useRef, useEffect } from 'react';
import { useKnowledgeChat, ChatMessage } from '../../hooks/useKnowledgeChat';

export default function KnowledgeChat() {
  const { messages, loading, applying, error, sendMessage, applyChanges, clearChat } =
    useKnowledgeChat();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderChanges = (msg: ChatMessage, index: number) => {
    if (!msg.hasChanges || !msg.changes?.changes) return null;

    return (
      <div className="mt-3 border border-blue-200 rounded-lg bg-blue-50 p-3">
        <div className="text-sm font-medium text-blue-800 mb-2">
          Предложенные изменения:
        </div>
        <ul className="text-sm text-blue-700 space-y-1 mb-3">
          {msg.changes.changes.map((change: any, i: number) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-blue-400 mt-0.5">
                {change.operation === 'delete_item' ? '🗑️' : change.operation === 'add_item' ? '➕' : '✏️'}
              </span>
              <span>
                <span className="font-mono text-xs bg-blue-100 px-1 rounded">{change.file}</span>{' '}
                — {change.description}
              </span>
            </li>
          ))}
        </ul>
        {msg.changes.summary && (
          <p className="text-sm text-blue-600 mb-3 italic">{msg.changes.summary}</p>
        )}
        {msg.applied ? (
          <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Изменения применены
          </div>
        ) : (
          <button
            onClick={() => applyChanges(index)}
            disabled={applying}
            className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {applying ? 'Применяю...' : 'Применить изменения'}
          </button>
        )}
      </div>
    );
  };

  const formatContent = (content: string) => {
    // Remove JSON code fences for display (changes are shown separately)
    return content.replace(/```json\n?[\s\S]*?\n?```/g, '').trim();
  };

  return (
    <div className="flex flex-col h-[600px] border border-gray-200 rounded-lg bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">AI-ассистент базы знаний</h3>
          <p className="text-xs text-gray-500">
            Напишите что изменить, например: «убери домик на 4 за 120к — он сдан»
          </p>
        </div>
        <button
          onClick={clearChat}
          className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
        >
          Очистить чат
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 text-sm mt-8">
            <p className="mb-2">Напишите инструкцию для обновления базы знаний</p>
            <div className="space-y-1 text-xs text-gray-300">
              <p>Примеры:</p>
              <p>«Домик на 4 за 120к сдали, убери его»</p>
              <p>«Добавь новый офис на ЧП: 3 места, 130к/мес»</p>
              <p>«Домик на 6 — это на самом деле офис №4 в основном доме»</p>
            </div>
          </div>
        )}
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-4 py-2.5 ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <div className="text-sm whitespace-pre-wrap">{formatContent(msg.content)}</div>
              {msg.role === 'assistant' && renderChanges(msg, index)}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-100">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-200 p-3">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Напишите инструкцию..."
            rows={2}
            className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors self-end"
          >
            {loading ? '...' : 'Отправить'}
          </button>
        </div>
      </div>
    </div>
  );
}
