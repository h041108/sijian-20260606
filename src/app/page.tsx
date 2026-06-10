'use client';

import { useState, useCallback, useRef } from 'react';
import MindSpaceView from '@/components/MindSpaceView';
import type { MindSpace } from '@/lib/deepseek';

export default function Home() {
  const [input, setInput] = useState('');
  const [mindSpace, setMindSpace] = useState<MindSpace | null>(null);
  const [loading, setLoading] = useState(false);
  const [appLoading, setAppLoading] = useState(false);
  const [error, setError] = useState('');
  const [appHtml, setAppHtml] = useState<string | null>(null);
  const [appTitle, setAppTitle] = useState('');
  const [history, setHistory] = useState<{ input: string; mindSpace: MindSpace }[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleGenerate = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setLoading(true);
    setError('');
    setSelectedNode(null);
    try {
      const res = await fetch('/api/mindspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: trimmed }),
      });
      if (!res.ok) throw new Error((await res.json()).error || '生成失败');
      const data = await res.json();
      setMindSpace(data.mindSpace);
      setHistory((prev) => [{ input: trimmed, mindSpace: data.mindSpace }, ...prev.slice(0, 9)]);
    } catch (e) {
      setError(e instanceof Error ? e.message : '未知错误');
    } finally {
      setLoading(false);
    }
  }, [input]);

  const handleGenerateApp = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setAppLoading(true);
    setError('');
    setAppTitle(trimmed);
    try {
      const res = await fetch('/api/generate-app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: trimmed }),
      });
      if (!res.ok) throw new Error((await res.json()).error || '生成失败');
      const data = await res.json();
      setAppHtml(data.html);
    } catch (e) {
      setError(e instanceof Error ? e.message : '未知错误');
    } finally {
      setAppLoading(false);
    }
  }, [input]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate(); }
  }, [handleGenerate]);

  const handleNodeClick = useCallback((nodeId: string) => {
    if (!mindSpace) return;
    const node = mindSpace.nodes.find((n) => n.id === nodeId);
    if (node) setSelectedNode(node.label);
  }, [mindSpace]);

  const handleHistoryClick = useCallback((item: { input: string; mindSpace: MindSpace }) => {
    setInput(item.input);
    setMindSpace(item.mindSpace);
    setAppHtml(null);
  }, []);

  const nodeDetail = mindSpace?.nodes.find((n) => n.label === selectedNode) ?? null;

  return (
    <main className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">
            <span className="text-blue-600">思见</span>
            <span className="text-sm font-normal text-gray-400 ml-2">· 所思即所见</span>
          </h1>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row max-w-6xl mx-auto w-full gap-4 p-4">
        {/* 左侧 */}
        <div className="lg:w-96 flex flex-col gap-4">
          {/* 输入框 */}
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="说一句话，AI 帮你变成看得见的东西..."
              className="w-full h-24 resize-none border-0 focus:ring-0 text-gray-700 placeholder-gray-400 text-sm"
              maxLength={2000}
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-gray-400">{input.length}/2000</span>
              <div className="flex gap-2">
                <button
                  onClick={handleGenerate}
                  disabled={loading || !input.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? '拆解中...' : '🧠 思维空间'}
                </button>
                <button
                  onClick={handleGenerateApp}
                  disabled={appLoading || !input.trim()}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {appLoading ? '生成中...' : '✨ 生成应用'}
                </button>
              </div>
            </div>
            {error && <div className="mt-2 text-xs text-red-500 bg-red-50 rounded p-2">{error}</div>}
          </div>

          {/* 节点详情 */}
          {nodeDetail && (
            <div className="bg-white rounded-xl shadow-sm border p-4 animate-in fade-in">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">🔍 AI 理解详情</h3>
                <button onClick={() => setSelectedNode(null)} className="text-gray-400 hover:text-gray-600 text-xs">关闭 ✕</button>
              </div>
              <div className="space-y-2 text-sm">
                <div><span className="text-gray-400 text-xs">概念</span><p className="text-gray-800 font-medium">{nodeDetail.label}</p></div>
                <div><span className="text-gray-400 text-xs">AI 的理解</span><p className="text-gray-700">{nodeDetail.explanation}</p></div>
                {nodeDetail.confidence !== undefined && (
                  <div>
                    <span className="text-gray-400 text-xs">置信度</span>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${nodeDetail.confidence * 100}%`, backgroundColor: nodeDetail.confidence > 0.8 ? '#22c55e' : nodeDetail.confidence > 0.5 ? '#eab308' : '#ef4444' }} />
                      </div>
                      <span className="text-xs text-gray-500">{Math.round(nodeDetail.confidence * 100)}%</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 历史 */}
          {history.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <h3 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">历史记录</h3>
              <div className="space-y-1.5">
                {history.map((item, i) => (
                  <button key={i} onClick={() => handleHistoryClick(item)}
                    className="w-full text-left text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded px-2 py-1.5 truncate transition-colors">
                    {item.input}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 右侧 */}
        <div className="flex-1 flex flex-col gap-4">
          {/* 思维空间 */}
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden min-h-[300px] flex-1">
            {mindSpace ? (
              <MindSpaceView mindSpace={mindSpace} onNodeClick={handleNodeClick} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
                <p className="text-sm">输入一句话，看看 AI 怎么理解</p>
                <p className="text-xs text-gray-300 mt-1">然后点「生成应用」让 AI 直接做出一个能玩的东西</p>
              </div>
            )}
          </div>

          {/* 生成的应用 */}
          {appHtml && (
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 border-b flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">🎮 {appTitle}</span>
                <span className="text-xs text-gray-400">AI 生成 · 可交互</span>
              </div>
              <div className="h-[400px]">
                <iframe
                  ref={iframeRef}
                  srcDoc={appHtml}
                  className="w-full h-full border-0"
                  sandbox="allow-scripts"
                  title={appTitle}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className="text-center py-4 text-xs text-gray-400 border-t bg-white/50">
        推信 · 思见 — 所思即所见，所学即所用
      </footer>
    </main>
  );
}
