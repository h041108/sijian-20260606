'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import MindSpaceView from '@/components/MindSpaceView';
import type { MindSpace } from '@/lib/deepseek';

export default function Home() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '你好呀！有什么想问的想聊的，直接跟我说吧 😊' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [mindSpace, setMindSpace] = useState<MindSpace | null>(null);
  const [spaceLoading, setSpaceLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg = trimmed;
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInput('');
    setLoading(true);
    setSpaceLoading(true);

    // 同时请求：文字回复 + 思维空间
    try {
      const [chatRes, spaceRes] = await Promise.all([
        fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: userMsg, sessionId }),
        }),
        fetch('/api/mindspace', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input: userMsg }),
        }),
      ]);

      if (chatRes.ok) {
        const chatData = await chatRes.json();
        if (!sessionId) setSessionId(chatData.sessionId);
        setMessages(prev => [...prev, { role: 'assistant', content: chatData.reply }]);
      }

      if (spaceRes.ok) {
        const spaceData = await spaceRes.json();
        setMindSpace(spaceData.mindSpace);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '抱歉，出错了' }]);
    } finally {
      setLoading(false);
      setSpaceLoading(false);
    }
  }, [input, loading, sessionId]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend]);

  return (
    <main className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-800">
            <span className="text-blue-600">思见</span>
            <span className="text-xs text-gray-400 ml-2">· 所思即所见</span>
          </h1>
        </div>
      </header>

      <div className="flex-1 flex max-w-6xl mx-auto w-full gap-0 overflow-hidden">
        {/* 左栏：聊天 */}
        <div className="flex flex-col w-1/2 border-r bg-white">
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-md'
                      : 'bg-gray-50 text-gray-800 rounded-bl-md border'
                  }`}>
                    {msg.role === 'assistant' && <div className="text-xs text-blue-600 font-medium mb-1">思见</div>}
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-50 rounded-2xl rounded-bl-md px-4 py-3 border max-w-[85%]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
          <div className="border-t p-3">
            <div className="flex items-end gap-2">
              <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown} placeholder="说点什么..."
                className="flex-1 resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={1} maxLength={2000} disabled={loading} />
              <button onClick={handleSend} disabled={loading || !input.trim()}
                className="px-5 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 transition-colors">
                发送
              </button>
            </div>
          </div>
        </div>

        {/* 右栏：思维空间 */}
        <div className="w-1/2 bg-gray-50 flex flex-col">
          <div className="px-4 py-3 border-b bg-white">
            <span className="text-sm font-semibold text-gray-700">🧠 思维空间</span>
            <span className="text-xs text-gray-400 ml-2">AI 理解你的方式</span>
          </div>
          <div className="flex-1">
            {mindSpace ? (
              <MindSpaceView mindSpace={mindSpace} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
                <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <p className="text-sm text-center text-gray-400">左边聊着天</p>
                <p className="text-xs text-gray-300 mt-1">这里会实时展示 AI 的思维空间</p>
              </div>
            )}
            {spaceLoading && (
              <div className="flex items-center justify-center py-4">
                <span className="text-xs text-gray-400">生成思维空间中...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
