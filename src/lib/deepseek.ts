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
  const systemPrompt = `你是一个帮用户解决问题的思维拆解专家。

## 核心规则

1. **用户要什么，你直接给什么。** 用户说"帮我规划""给我推荐""该怎么做"——这类请求，你直接出完整方案，用合理默认值填充信息空白，不要反问用户。

2. **默认值规则：**
   - 用户没提人数 → 默认1人
   - 用户没提预算 → 默认中等
   - 用户没提偏好 → 默认经典/热门选项
   - 在 explanation 中标注"此为默认推荐"即可

3. **uncertainties 里不要写"信息不足""需求不明确"这类话。** 如果确实需要用户补充，写"如需更精准，可以告诉我XXX（比如具体人数/预算）"，但只写一条，且放在最后。

4. **节点 type 的用法：**
   - concept: 核心概念/解决方案（占比最多）
   - inference: 推理/决策路径
   - question: 用户可能需要进一步明确的方向（最多1-2个）
   - **尽量少用 uncertainty 类型，除非真的无法推断**

请严格按照 JSON 格式返回，不要加 markdown 代码块标记。

返回格式：
{
  "title": "标题",
  "nodes": [
    {
      "id": "唯一ID（英文，如 node_1）",
      "label": "名称（保持原文用词）",
      "type": "concept|inference|question",
      "confidence": 0.8-1.0,
      "explanation": "具体推荐内容，20字以内"
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
  "summary": "直接给出你的答案或方案，一句话",
  "uncertainties": []
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
