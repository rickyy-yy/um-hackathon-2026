import OpenAI from 'openai';
import {
  AnalyticsResult,
  FullReport,
  OcrExtraction,
  FollowupTurn,
  ReportNarration,
  WhatIfAnswer,
} from './schemas';
import {
  ocrPrompt,
  followupPrompt,
  reportPrompt,
  whatIfPrompt,
  systemPrompt,
} from './prompts';
import * as mocks from './mocks';
import type { Locale } from './i18n/dictionary';

type LlmTask =
  | { task: 'ocr'; imageBase64: string; mimeType: string; locale?: Locale }
  | { task: 'followup'; turnIndex: number; extracted: unknown; askedSoFar: string[]; locale?: Locale }
  | { task: 'report'; analytics: AnalyticsResult; locale?: Locale }
  | { task: 'whatif'; report: FullReport; question: string; locale?: Locale };

export type LlmResult<T extends LlmTask['task']> = T extends 'ocr'
  ? OcrExtraction
  : T extends 'followup'
    ? FollowupTurn
    : T extends 'report'
      ? ReportNarration
      : T extends 'whatif'
        ? WhatIfAnswer
        : never;

function isMockMode(): boolean {
  return (process.env.MOCK_LLM ?? 'true').toLowerCase() === 'true' || !process.env.LLM_API_KEY;
}

let client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      baseURL: process.env.LLM_BASE_URL || 'https://api.openai.com/v1',
      apiKey: process.env.LLM_API_KEY || 'missing-key',
    });
  }
  return client;
}

async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  maxAttempts = 2
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e: unknown) {
      lastErr = e;
      const status = (e as { status?: number })?.status;
      const retryable =
        status === 429 || (typeof status === 'number' && status >= 500 && status < 600);
      if (!retryable || attempt === maxAttempts) {
        console.warn(`[llm:${label}] giving up after attempt ${attempt}:`, status ?? e);
        throw e;
      }
      const delay = 500 * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 200);
      console.warn(`[llm:${label}] attempt ${attempt} failed (${status}), retrying in ${delay}ms`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

async function chatJson<T>(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  label: string
): Promise<T> {
  const resp = await withRetry(
    () =>
      getClient().chat.completions.create({
        model: process.env.LLM_MODEL || 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages,
      }),
    label
  );
  const content = resp.choices[0]?.message?.content ?? '{}';
  return JSON.parse(content) as T;
}

function mockFor<T extends LlmTask>(args: T, locale: Locale): LlmResult<T['task']> {
  switch (args.task) {
    case 'ocr':
      return mocks.mockOcr() as LlmResult<T['task']>;
    case 'followup':
      return mocks.mockFollowup(args.turnIndex, locale) as LlmResult<T['task']>;
    case 'report':
      return mocks.mockReport(args.analytics, locale) as LlmResult<T['task']>;
    case 'whatif':
      return mocks.mockWhatIf(args.question, args.report, locale) as LlmResult<T['task']>;
    default:
      throw new Error('unreachable');
  }
}

export async function llm<T extends LlmTask>(args: T): Promise<LlmResult<T['task']>> {
  const locale: Locale = args.locale ?? 'ms';

  if (isMockMode()) {
    return mockFor(args, locale);
  }

  try {
    return await callReal(args, locale);
  } catch (e) {
    // Fall back to mock rather than crash the UI when the real provider is
    // misconfigured, auth-rejected, or otherwise unavailable. Log loudly so
    // the problem is visible in server logs.
    console.warn(
      `[llm:${args.task}] real provider failed, falling back to mock:`,
      (e as { status?: number })?.status ?? (e as Error)?.message ?? e
    );
    return mockFor(args, locale);
  }
}

async function callReal<T extends LlmTask>(
  args: T,
  locale: Locale
): Promise<LlmResult<T['task']>> {
  const systemMsg = systemPrompt(locale);

  switch (args.task) {
    case 'ocr': {
      const resp = await withRetry(
        () =>
          getClient().chat.completions.create({
            model: process.env.LLM_MODEL || 'gpt-4o-mini',
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: systemMsg },
              {
                role: 'user',
                content: [
                  { type: 'text', text: ocrPrompt(locale) },
                  {
                    type: 'image_url',
                    image_url: { url: `data:${args.mimeType};base64,${args.imageBase64}` },
                  },
                ],
              },
            ],
          }),
        'ocr'
      );
      const parsed = JSON.parse(resp.choices[0]?.message?.content ?? '{}');
      return OcrExtraction.parse(parsed) as LlmResult<T['task']>;
    }
    case 'followup': {
      const raw = await chatJson<unknown>(
        [
          { role: 'system', content: systemMsg },
          { role: 'user', content: followupPrompt(args.extracted, args.askedSoFar, locale) },
        ],
        'followup'
      );
      return FollowupTurn.parse(raw) as LlmResult<T['task']>;
    }
    case 'report': {
      const raw = await chatJson<unknown>(
        [
          { role: 'system', content: systemMsg },
          { role: 'user', content: reportPrompt(args.analytics, locale) },
        ],
        'report'
      );
      return ReportNarration.parse(raw) as LlmResult<T['task']>;
    }
    case 'whatif': {
      const raw = await chatJson<unknown>(
        [
          { role: 'system', content: systemMsg },
          { role: 'user', content: whatIfPrompt(args.report, args.question, locale) },
        ],
        'whatif'
      );
      return WhatIfAnswer.parse(raw) as LlmResult<T['task']>;
    }
    default:
      throw new Error('unreachable');
  }
}
