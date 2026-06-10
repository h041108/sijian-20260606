/**
 * DeepSeek API 接入
 * 用于生成思维空间、拆解用户输入
 */

export interface MindNode {
  id: string;
  label: string;
  type: 'concept' | 'inference' | 'uncertainty' | 'question';
  confidence: number;
  explanation: string;
  /** 可选的子节点（嵌套概念） */
  children?: MindNode[];
}

export interface MindEdge {
  source: string;
  target: string;
  label: string;
  type: 'causal' | 'belongs' | 'association' | 'contrast' | 'sequence';
}

export interface MindSpace {
  title: string;
  nodes: MindNode[];
  edges: MindEdge[];
  summary: string;
  /** AI 不确定的地方 */
  uncertainties: string[];
}

// 从用户输入生成思维空间
export async function generateMindSpace(input: string): Promise<MindSpace> {
  const systemPrompt = `你是一个思维拆解专家。用户输入一句话或一段话，你需要：
1. 拆解出其中的核心概念（节点）
2. 找出概念之间的关系（边）
3. 标注AI不确定的地方

请严格按照 JSON 格式返回，不要加 markdown 代码块标记。

返回格式：
{
  "title": "这段内容的标题",
  "nodes": [
    {
      "id": "唯一ID（英文，如 node_1）",
      "label": "概念名称（保持原文用词）",
      "type": "concept|inference|uncertainty|question",
      "confidence": 0.0-1.0,
      "explanation": "对这个概念的理解说明，20字以内"
    }
  ],
  "edges": [
    {
      "source": "节点id",
      "target": "节点id",
      "label": "关系描述",
      "type": "causal|belongs|association|contrast|sequence"
    }
  ],
  "summary": "对这段内容的整体理解总结，一句话",
  "uncertainties": ["AI不太确定的地方"]
}`;

  const response = await fetch(
    `${process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com/v1'}/chat/completions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: input },
        ],
        temperature: 0.3, // 低温度保持稳定输出
        max_tokens: 2000,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DeepSeek API error: ${response.status} ${error}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  // 解析 JSON
  try {
    // 尝试直接解析
    return JSON.parse(content.trim());
  } catch {
    // 如果返回了 markdown 代码块，从中提取 JSON
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1].trim());
    }
    throw new Error('Failed to parse AI response as JSON');
  }
}

// 对比两个思维空间（"换种说法"功能）
export async function compareMindSpaces(
  original: string,
  revised: string
): Promise<{
  original: MindSpace;
  revised: MindSpace;
  differences: string[];
}> {
  const [originalSpace, revisedSpace] = await Promise.all([
    generateMindSpace(original),
    generateMindSpace(revised),
  ]);

  const systemPrompt = `比较以下两个思维空间的差异，列出关键的不同点。
返回 JSON 格式：
{
  "differences": ["差异1", "差异2", ...]
}`;

  const response = await fetch(
    `${process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com/v1'}/chat/completions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: JSON.stringify({
              原始空间: originalSpace,
              修改后空间: revisedSpace,
            }),
          },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    }
  );

  const data = await response.json();
  const content = data.choices[0].message.content;

  try {
    return {
      original: originalSpace,
      revised: revisedSpace,
      ...JSON.parse(content.trim()),
    };
  } catch {
    return {
      original: originalSpace,
      revised: revisedSpace,
      differences: ['AI 无法生成差异分析，请检查输入'],
    };
  }
}
