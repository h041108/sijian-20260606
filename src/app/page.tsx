'use client';

import { useState, useCallback } from 'react';
import MindSpaceView from '@/components/MindSpaceView';
import type { MindSpace } from '@/lib/deepseek';

export default function Home() {
  const [input, setInput] = useState('');
  const [mindSpace, setMindSpace] = useState<MindSpace | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<{ input: string; mindSpace: MindSpace }[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // 生成思维空间
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

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '生成失败');
      }

      const data = await res.json();
      setMindSpace(data.mindSpace);
      setHistory((prev) => [
        { input: trimmed, mindSpace: data.mindSpace },
        ...prev.slice(0, 9), // 最多保留10条历史
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : '未知错误');
    } finally {
      setLoading(false);
    }
  }, [input]);

  // 键盘事件：Enter 生成
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleGenerate();
      }
    },
    [handleGenerate]
  );

  // 点击节点查看详情
  const handleNodeClick = useCallback(
    (nodeId: string) => {
      if (!mindSpace) return;
      const node = mindSpace.nodes.find((n) => n.id === nodeId);
      if (node) {
        setSelectedNode(node.label);
      }
    },
    [mindSpace]
  );

  // 查看历史记录中的某条
  const handleHistoryClick = useCallback(
    (item: { input: string; mindSpace: MindSpace }) => {
      setInput(item.input);
      setMindSpace(item.mindSpace);
    },
    []
  );

  // 找到被选中的节点数据
  const nodeDetail = mindSpace?.nodes.find((n) => n.label === selectedNode) ?? null;

  return (
    <main className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* 顶部品牌 */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">
              <span className="text-blue-600">思见</span>
              <span className="text-sm font-normal text-gray-400 ml-2">· 所思即所见</span>
            </h1>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="inline-block w-2 h-2 rounded-full bg-green-400" />
            在线
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row max-w-5xl mx-auto w-full gap-4 p-4">
        {/* 左侧：输入区 */}
        <div className="lg:w-96 flex flex-col gap-4">
          {/* 输入框 */}
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="说一句话，AI 帮你变成思维空间..."
              className="w-full h-28 resize-none border-0 focus:ring-0 text-gray-700 placeholder-gray-400 text-sm"
              maxLength={2000}
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-gray-400">{input.length}/2000</span>
              <button
                onClick={handleGenerate}
                disabled={loading || !input.trim()}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium
                  hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed
                  transition-colors"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    拆解中...
                  </span>
                ) : (
                  '生成思维空间'
                )}
              </button>
            </div>
            {error && (
              <div className="mt-2 text-xs text-red-500 bg-red-50 rounded p-2">{error}</div>
            )}
          </div>

          {/* 节点详情卡片 */}
          {nodeDetail && (
            <div className="bg-white rounded-xl shadow-sm border p-4 animate-in fade-in">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">🔍 AI 理解详情</h3>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-gray-400 hover:text-gray-600 text-xs"
                >
                  关闭 ✕
                </button>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-400 text-xs">概念</span>
                  <p className="text-gray-800 font-medium">{nodeDetail.label}</p>
                </div>
                <div>
                  <span className="text-gray-400 text-xs">AI 的理解</span>
                  <p className="text-gray-700">{nodeDetail.explanation}</p>
                </div>
                <div>
                  <span className="text-gray-400 text-xs">置信度</span>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${(nodeDetail.confidence || 0) * 100}%`,
                          backgroundColor:
                            nodeDetail.confidence > 0.8
                              ? '#22c55e'
                              : nodeDetail.confidence > 0.5
                              ? '#eab308'
                              : '#ef4444',
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">
                      {Math.round((nodeDetail.confidence || 0) * 100)}%
                    </span>
                  </div>
                </div>
                <div className="pt-2 border-t text-xs text-gray-400 italic">
                  {nodeDetail.type === 'uncertainty'
                    ? '⚠ AI 对这个概念不太确定，换个说法试试'
                    : '💡 点击其他节点继续探索'}
                </div>
              </div>
            </div>
          )}

          {/* 历史记录 */}
          {history.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <h3 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">
                历史记录
              </h3>
              <div className="space-y-1.5">
                {history.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => handleHistoryClick(item)}
                    className="w-full text-left text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded px-2 py-1.5 truncate transition-colors"
                  >
                    {item.input}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 右侧：思维空间可视化 */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border overflow-hidden min-h-[500px]">
          {mindSpace ? (
            <MindSpaceView mindSpace={mindSpace} onNodeClick={handleNodeClick} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
              <svg
                className="w-16 h-16 mb-4 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              <p className="text-sm text-center">输入一句话，点击「生成思维空间」</p>
              <p className="text-xs text-gray-300 mt-1">看看 AI 怎么理解你的想法</p>
            </div>
          )}
        </div>
      </div>

      {/* 底部提示 */}
      <footer className="text-center py-4 text-xs text-gray-400 border-t bg-white/50">
        推信 · 思见 — 所思即所见
      </footer>
    </main>
  );
}
