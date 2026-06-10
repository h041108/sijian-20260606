/**
 * 思维空间生成 API
 * POST /api/mindspace
 * Body: { input: string }
 * Response: { mindSpace: MindSpace }
 */
import { NextRequest, NextResponse } from 'next/server';
import { generateMindSpace, type MindSpace } from '@/lib/deepseek';

export async function POST(request: NextRequest) {
  try {
    const { input } = await request.json();

    if (!input || typeof input !== 'string' || input.trim().length === 0) {
      return NextResponse.json(
        { error: '请输入有效内容' },
        { status: 400 }
      );
    }

    if (input.length > 2000) {
      return NextResponse.json(
        { error: '输入内容过长，请控制在2000字以内' },
        { status: 400 }
      );
    }

    const mindSpace: MindSpace = await generateMindSpace(input.trim());

    return NextResponse.json({
      input: input.trim(),
      mindSpace,
    });
  } catch (error) {
    console.error('思维空间生成失败:', error);
    return NextResponse.json(
      {
        error: '生成失败，请稍后重试',
        detail: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    );
  }
}
