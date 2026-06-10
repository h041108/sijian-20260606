'use client';

import { useEffect, useRef } from 'react';
import cytoscape, { type Core, type ElementDefinition } from 'cytoscape';
import type { MindSpace } from '@/lib/deepseek';

interface MindSpaceViewProps {
  mindSpace: MindSpace;
  onNodeClick?: (nodeId: string) => void;
}

// 节点类型 → 颜色映射
const typeColors: Record<string, string> = {
  concept: '#4A90D9',       // 蓝色 - 概念
  inference: '#7B61FF',     // 紫色 - 推理
  uncertainty: '#FF6B6B',   // 红色 - 不确定
  question: '#FFB347',      // 橙色 - 问题
};

const typeShapes: Record<string, cytoscape.Css.NodeShape> = {
  concept: 'ellipse',
  inference: 'diamond',
  uncertainty: 'roundrectangle',
  question: 'triangle',
};

export default function MindSpaceView({ mindSpace, onNodeClick }: MindSpaceViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);

  useEffect(() => {
    if (!containerRef.current || cyRef.current) return;

    // 构建 Cytoscape 元素
    const elements: ElementDefinition[] = [
      // 节点
      ...mindSpace.nodes.map((node) => ({
        data: {
          id: node.id,
          label: node.label,
          type: node.type,
          confidence: node.confidence,
          explanation: node.explanation,
        },
        classes: node.type,
      })),
      // 边
      ...mindSpace.edges.map((edge) => ({
        data: {
          id: `${edge.source}-${edge.target}`,
          source: edge.source,
          target: edge.target,
          label: edge.label,
          type: edge.type,
        },
        classes: edge.type,
      })),
    ];

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        // 节点样式
        {
          selector: 'node',
          style: {
            label: 'data(label)',
            'text-valign': 'center',
            'text-halign': 'center',
            'font-size': '12px',
            'font-family': '"PingFang SC", "Microsoft YaHei", sans-serif',
            'text-wrap': 'wrap',
            'text-max-width': '80px',
            color: '#fff',
            width: 'label',
            height: 'label',
            padding: '10px',
            'border-width': 2,
            'border-color': 'white',
            'border-opacity': 0.3,
            'min-zoomed-font-size': 8,
          },
        },
        // 基础节点类型颜色
        {
          selector: 'node.concept',
          style: {
            'background-color': typeColors.concept,
            shape: typeShapes.concept,
          },
        },
        {
          selector: 'node.inference',
          style: {
            'background-color': typeColors.inference,
            shape: typeShapes.inference,
          },
        },
        {
          selector: 'node.uncertainty',
          style: {
            'background-color': typeColors.uncertainty,
            shape: typeShapes.uncertainty,
            'border-style': 'dashed',
            'border-opacity': 1,
          },
        },
        {
          selector: 'node.question',
          style: {
            'background-color': typeColors.question,
            shape: typeShapes.question,
          },
        },
        // 置信度视觉（低置信度变淡）
        {
          selector: 'node[confidence < 0.5]',
          style: {
            opacity: 0.5,
          },
        },
        {
          selector: 'node[confidence >= 0.5][confidence < 0.8]',
          style: {
            opacity: 0.75,
          },
        },
        // 边样式
        {
          selector: 'edge',
          style: {
            width: 2,
            'line-color': '#9ca3af',
            'target-arrow-color': '#9ca3af',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            label: 'data(label)',
            'font-size': '10px',
            'font-family': '"PingFang SC", "Microsoft YaHei", sans-serif',
            color: '#6b7280',
            'text-background-color': '#ffffff',
            'text-background-opacity': 0.8,
            'text-background-padding': '2px',
          },
        },
        // 悬停效果
        {
          selector: 'node:active',
          style: {
            'border-color': '#2563eb',
            'border-width': 3,
            'border-opacity': 1,
          },
        },
      ],
      layout: {
        name: 'cose',
        animate: true,
        animationDuration: 800,
        fit: true,
        padding: 80,
        nodeRepulsion: 35000,
        nodeOverlap: 100,
        idealEdgeLength: 200,
        gravity: 0.6,
        nestingFactor: 0.8,
        numIter: 2000,
      },
      // 交互
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
      autoungrabify: false, // 允许拖拽节点
    });

    // 节点点击 → 弹出详情
    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      const id = node.id();
      if (onNodeClick) {
        onNodeClick(id);
      }
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [mindSpace, onNodeClick]);

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden bg-gray-50">
      {/* 图例 */}
      <div className="absolute top-3 left-3 z-10 bg-white/90 backdrop-blur-sm rounded-lg p-2.5 text-xs shadow-sm border">
        <div className="font-semibold mb-1.5 text-gray-700">图例</div>
        {Object.entries({
          concept: '概念',
          inference: '推理',
          uncertainty: '不确定',
          question: '问题',
        }).map(([type, label]) => (
          <div key={type} className="flex items-center gap-1.5 mb-1">
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ backgroundColor: typeColors[type] }}
            />
            <span className="text-gray-600">{label}</span>
          </div>
        ))}
      </div>

      {/* 总结 */}
      <div className="absolute bottom-3 left-3 right-3 z-10 bg-white/90 backdrop-blur-sm rounded-lg p-2.5 text-xs shadow-sm border">
        <div className="text-gray-700 leading-relaxed">{mindSpace.summary}</div>
      </div>

      <div ref={containerRef} className="w-full h-full min-h-[400px]" />
    </div>
  );
}
