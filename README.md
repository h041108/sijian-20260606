# 思见 · MVP

> 所思即所见，所学即所用

## 快速启动

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.local.example .env.local
# 编辑 .env.local，填入你的 DeepSeek API Key

# 3. 启动开发服务器
npm run dev
```

打开 http://localhost:3000

## 技术栈

- **框架:** Next.js 15 (App Router)
- **语言:** TypeScript
- **样式:** Tailwind CSS
- **可视化:** Cytoscape.js
- **数据库:** Supabase (可选，MVP 阶段可先不启用)
- **AI:** DeepSeek V3 (通过中转 API)

## 项目结构

```
src/
├── app/
│   ├── api/
│   │   └── mindspace/
│   │       └── route.ts      # 思维空间生成 API
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx              # 主页面
├── components/
│   └── MindSpaceView.tsx     # 思维空间可视化组件
└── lib/
    ├── deepseek.ts           # DeepSeek API 接入
    └── supabase.ts           # Supabase 客户端
```

## 功能

- [x] 文字输入 → 思维空间生成
- [x] 思维空间可视化（节点+关系图）
- [x] 节点点击查看 AI 理解详情
- [x] 历史记录
- [ ] 语音输入
- [ ] 图片上传（OCR）
- [ ] "换种说法"对比
- [ ] 视频分析
- [ ] Supabase 数据持久化

## 部署

```bash
# 构建
npm run build

# 部署到 Vercel
npx vercel
```

## 环境变量

| 变量 | 说明 |
|------|------|
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥 |
| `DEEPSEEK_API_BASE` | API 中转地址（可选） |
| `DEEPSEEK_MODEL` | 模型名（默认 deepseek-chat） |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目地址 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名密钥 |
