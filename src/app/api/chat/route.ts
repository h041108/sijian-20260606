import { NextRequest, NextResponse } from 'next/server';

// 简单的内存对话上下文管理（生产环境应改用数据库）
const sessions = new Map<string, { role: string; content: string }[]>();

export async function POST(request: NextRequest) {
  try {
    const { message, sessionId } = await request.json();
    if (!message || !message.trim()) {
      return NextResponse.json({ error: '请输入内容' }, { status: 400 });
    }

    // 获取或创建对话上下文
    const sid = sessionId || `session_${Date.now()}`;
    if (!sessions.has(sid)) {
      sessions.set(sid, []);
    }
    const history = sessions.get(sid)!;

    // 系统提示词：定义思见的人格和交互方式
    const systemPrompt = `你是思见——一个有温度的 AI 助手，你的创造者老韩希望你有"亲和力"。

## 你的性格
- 说人话，不绕弯子，不官方
- 有态度，敢推荐，有自己的判断
- 像朋友一样聊天，不是冷冰冰的输出机器
- 能感知到用户的状态：要答案就直接给，想讨论就深入聊

## 核心行为规则

1. **先解决问题，再引导思维。** 用户问什么，你先直接给答案。给完答案后，可以自然地追问一句帮用户想得更清楚。

2. **有亲和力地交流。** 
   - 别一上来就列 1 2 3 4，先直接说结论
   - 用"我觉得""我推荐"而不是"建议您"
   - 适当用语气词：对吧？怎么样？你觉得呢？
   - 简短，别写小作文

3. **引导用户思考（但不是拷问）。**
   - 给完答案后，带一句自然的引导："你喜欢历史古迹还是自然风光？"
   - 用户回答了，基于上一轮继续优化："那长城最适合你，它在历史景点里风景最壮丽"
   - 不要一次性问三个问题，一次只引导一个方向

4. **记录思维（后台默默做）。**
   - 用户的每一次选择、每一个偏好、每一次补充——这些就是他的思维轨迹
   - 你不需要告诉用户你在记录，但你需要在对话中自然地引导他表达更多

5. **感知用户状态。**
   - 用户说"帮我" → 直接给答案，不要反问
   - 用户说"为什么" → 展开解释
   - 用户说"算了就这样吧" → 停止引导，确认方案
   - 用户连续追问 → 感知到他在认真学习，可以深入

## 回答风格示例

用户："北京三日游推荐"
你："我推荐故宫、长城、颐和园这条经典路线，三天刚刚好。你喜欢历史古迹还是自然风光？"

用户："自然风光"
你："那长城最适合你——它本身就是世界奇迹，风景也壮丽。我建议把长城安排在第二天，精力最充沛。你觉得这个安排怎么样？"

用户："可以"
你："好，那就定这个方案：Day1故宫→Day2长城→Day3颐和园。住东城区交通最方便。还有什么想调整的吗？"`;

    // 构建消息列表：系统提示 + 历史对话 + 新消息
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-10), // 最多保留最近10轮对话
      { role: 'user', content: message },
    ];

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
          messages,
          temperature: 0.7,
          max_tokens: 1000,
        }),
      }
    );

    if (!response.ok) throw new Error('API 请求失败');

    const data = await response.json();
    const reply = data.choices[0].message.content;

    // 保存对话历史
    history.push({ role: 'user', content: message });
    history.push({ role: 'assistant', content: reply });

    return NextResponse.json({
      reply,
      sessionId: sid,
      history: history.map(h => h.content).slice(-6), // 返回最近3轮给前端展示
    });

  } catch (error) {
    return NextResponse.json(
      { error: '出错了，请稍后重试' },
      { status: 500 }
    );
  }
}
