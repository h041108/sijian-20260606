'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import MindSpaceView from '@/components/MindSpaceView';

export default function Home() {
  const [messages, setMessages] = useState([{ role: 'assistant', content: 'Hello! Ask me anything, I am here to help :)' }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [mindSpace, setMindSpace] = useState(null);
  const [spaceLoading, setSpaceLoading] = useState(false);
  const ref = useRef(null);
  useEffect(() => { ref.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = useCallback(async () => {
    const t = input.trim(); if (!t || loading) return;
    setMessages(p => [...p, { role: 'user', content: t }]);
    setInput(''); setLoading(true); setSpaceLoading(true);
    try {
      const [cr, sr] = await Promise.all([
        fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: t, sessionId }) }),
        fetch('/api/mindspace', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ input: t }) }),
      ]);
      if (cr.ok) { const d = await cr.json(); if (!sessionId) setSessionId(d.sessionId); setMessages(p => [...p, { role: 'assistant', content: d.reply }]); }
      if (sr.ok) { const d = await sr.json(); setMindSpace(d.mindSpace); }
    } catch { setMessages(p => [...p, { role: 'assistant', content: 'Sorry, something went wrong.' }]); }
    finally { setLoading(false); setSpaceLoading(false); }
  }, [input, loading, sessionId]);

  const kd = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

  return (
    <main className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-white border-b px-4 py-3">
        <h1 className="text-lg font-bold"><span className="text-blue-600">SiJian</span><span className="text-xs text-gray-400 ml-2">- See What You Think</span></h1>
      </header>
      <div className="flex-1 flex max-w-6xl mx-auto w-full">
        <div className="w-1/2 flex flex-col border-r bg-white">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m,i) => (
              <div key={i} className={'flex ' + (m.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={'max-w-[85%] rounded-2xl px-4 py-3 ' + (m.role === 'user' ? 'bg-blue-600 text-white rounded-br-md' : 'bg-gray-50 rounded-bl-md border' )}>
                  {m.role === 'assistant' && <div className="text-xs text-blue-600 mb-1">SiJian</div>}
                  <div className="text-sm whitespace-pre-wrap">{m.content}</div>
                </div>
              </div>
            ))}
            {loading && <div className="flex justify-start"><div className="bg-gray-50 rounded-2xl px-4 py-3 border"><span className="inline-block w-2 h-2 bg-gray-400 rounded-full animate-bounce mx-0.5" /><span className="inline-block w-2 h-2 bg-gray-400 rounded-full animate-bounce mx-0.5" style={{animationDelay:'150ms'}} /><span className="inline-block w-2 h-2 bg-gray-400 rounded-full animate-bounce mx-0.5" style={{animationDelay:'300ms'}} /></div></div>}
            <div ref={ref} />
          </div>
          <div className="border-t p-3">
            <div className="flex gap-2">
              <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={kd} placeholder="Say something..." className="flex-1 resize-none rounded-xl border px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500" rows={1} disabled={loading} />
              <button onClick={send} disabled={loading || !input.trim()} className="px-5 py-3 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700 disabled:bg-gray-300">Send</button>
            </div>
          </div>
        </div>
        <div className="w-1/2 bg-gray-50 flex flex-col">
          <div className="px-4 py-3 border-b bg-white"><span className="text-sm font-semibold">Mind Space</span><span className="text-xs text-gray-400 ml-2">How AI understands you</span></div>
          <div className="flex-1">
            {mindSpace ? <MindSpaceView mindSpace={mindSpace} /> : <div className="flex items-center justify-center h-full text-gray-400 text-sm p-8">Chat on the left, see AI mind space here</div>}
            {spaceLoading && <div className="text-center text-xs text-gray-400 py-2">Generating mind space...</div>}
          </div>
        </div>
      </div>
    </main>
  );
}
