/**
 * DeepSeek API 接入
 * 用于生成思维空间、拆解用户输入
 */

export interface MindNode {
  id: string;
  label: string;
  type: 'concept' | 'inference' | 'question';
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
  const systemPrompt = `你是一个聪明的问题解决专家，擅于用思维导图展示答案。

## 核心规则

1. **用户要答案，你直接给答案。** 用户说"推荐""规划""怎么""哪里""什么"——意味着他要的是具体方案。你的任务不是拆解用户的话，而是给出解决方案本身。

2. **节点的 label 必须是答案本身，而不是对用户提问的拆解。**
   ❌ 错误：节点叫"时间限制3天"→ 这是拆解用户的话
   ✅ 正确：节点叫"第1天·故宫+天安门"→ 这是直接给答案

3. **每个节点直接展示一个具体建议。** 每条边表示建议之间的逻辑关系（先后顺序、替代选择、因果关系）。

4. **如果用户信息不全，用合理默认值填充（默认1人、默认经典选项），直接出完整方案。** 不要在 uncertainties 里写"信息不足"。

5. **summary 直接给出最终推荐结论。**

## 举例

用户说"北京玩3天推荐"，正确的思维空间应该是：
- 节点："Day1·故宫+天安门广场"（类型：concept）
- 节点："Day2·八达岭长城+鸟巢"（类型：concept）
- 节点："Day3·颐和园+南锣鼓巷"（类型：concept）
- 节点："住宿建议·东城区"（类型：concept）
- 边：Day1 → 顺序 → Day2
- summary："推荐故宫、长城、颐和园三日经典路线，住东城区"

用户说"推荐几本书"，正确的思维空间应该是：
- 节点："《三体》刘慈欣"（类型：concept）
- 节点："《百年孤独》马尔克斯"（类型：concept）
- 边：无先后关系
- summary："推荐《三体》和《百年孤独》"

请严格按照 JSON 格式返回，不要加 markdown 代码块标记。

返回格式：
{
  "title": "解决方案标题",
  "nodes": [
    {
      "id": "唯一ID（英文）",
      "label": "具体推荐内容",
      "type": "concept",
      "confidence": 1.0,
      "explanation": "补充说明，10字以内"
    }
  ],
  "edges": [
    {
      "source": "节点id",
      "target": "节点id",
      "label": "顺序|替代|包含",
      "type": "sequence|association|belongs"
    }
  ],
  "summary": "直接给出你的最终推荐，一句话",
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
