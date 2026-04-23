import { NextResponse } from 'next/server';
import { llmStats } from '@/lib/llm';

export const dynamic = 'force-dynamic';

function providerFromBaseUrl(baseUrl: string): string {
  if (/z\.ai|bigmodel/.test(baseUrl)) return 'Z.AI';
  if (/openai\.com/.test(baseUrl)) return 'OpenAI';
  if (/anthropic/.test(baseUrl)) return 'Anthropic';
  return 'Custom';
}

export async function GET() {
  const mockEnv = (process.env.MOCK_LLM ?? 'true').toLowerCase() === 'true';
  const hasKey = !!process.env.LLM_API_KEY;
  const configuredMock = mockEnv || !hasKey;

  // "Effective" mode: if we've had a recent failure and fell back, show that
  const recentlyFellBack =
    llmStats.lastStatus !== null &&
    llmStats.lastStatus !== 200 &&
    llmStats.fallbackCount > 0 &&
    llmStats.realCallCount === 0;

  const effectiveMode: 'mock' | 'live' | 'degraded' = configuredMock
    ? 'mock'
    : recentlyFellBack
      ? 'degraded'
      : 'live';

  return NextResponse.json({
    ok: true,
    configuredMode: configuredMock ? 'mock' : 'live',
    effectiveMode,
    model: configuredMock ? null : process.env.LLM_MODEL || null,
    provider: configuredMock
      ? null
      : providerFromBaseUrl(process.env.LLM_BASE_URL ?? 'https://api.openai.com/v1'),
    stats: {
      realCallCount: llmStats.realCallCount,
      mockCallCount: llmStats.mockCallCount,
      fallbackCount: llmStats.fallbackCount,
      promptTokens: llmStats.promptTokens,
      completionTokens: llmStats.completionTokens,
      totalTokens: llmStats.totalTokens,
      lastCallAt: llmStats.lastCallAt,
      lastStatus: llmStats.lastStatus,
      lastErrorMessage: llmStats.lastErrorMessage,
      lastTask: llmStats.lastTask,
    },
  });
}
