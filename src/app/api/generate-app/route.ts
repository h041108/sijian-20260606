import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { input } = await request.json();
    if (!input || input.trim().length === 0) {
      return NextResponse.json({ error: '请输入有效内容' }, { status: 400 });
    }

    const systemPrompt = `你是一个交互应用生成专家。用户提出一个需求，你直接给出完整的、可运行的 HTML 页面。

## 核心规则

1. 用户要什么，你直接做什么。不要反问用户任何问题，基于合理默认值直接出完整方案。

2. 所有代码写在单个 HTML 文件中，CSS 和 JS 内嵌，风格清新现代的中文界面。

3. 确保交互功能完整可用：按钮能点、滑块能拖、输入能响应。

4. 如果用户说"帮我规划""推荐""安排"等请求，直接生成一个包含预设方案的交互页面，用户可以直接用，也可以修改。

5. 不要用外部 CDN 依赖，纯 HTML + CSS + JS。

返回格式：直接返回完整 HTML 代码，不要加 markdown 代码块标记。`;

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
            { role: 'user', content: `${input}` },
          ],
          temperature: 0.5,
          max_tokens: 4000,
        }),
      }
    );

    if (!response.ok) throw new Error('API 请求失败');

    const data = await response.json();
    let html = data.choices[0].message.content;
    html = html.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');

    return NextResponse.json({ html, input });
  } catch (error) {
    return NextResponse.json(
      { error: '生成失败，请稍后重试' },
      { status: 500 }
    );
  }
}
