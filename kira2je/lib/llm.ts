import OpenAI from 'openai';
import {
  AnalyticsResult,
  FullReport,
  OcrExtraction,
  FollowupTurn,
  ReportNarration,
  WhatIfAnswer,
} from './schemas';
import { ocrPrompt, followupPrompt, reportPrompt, whatIfPrompt, SYSTEM_BM } from './prompts';
import * as mocks from './mocks';

type LlmTask =
  | { task: 'ocr'; imageBase64: string; mimeType: string }
  | { task: 'followup'; turnIndex: number; extracted: unknown; askedSoFar: string[] }
  | { task: 'report'; analytics: AnalyticsResult }
  | { task: 'whatif'; report: FullReport; question: string };

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

async function chatJson<T>(messages: OpenAI.Chat.ChatCompletionMessageParam[]): Promise<T> {
  const resp = await getClient().chat.completions.create({
    model: process.env.LLM_MODEL || 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages,
  });
  const content = resp.choices[0]?.message?.content ?? '{}';
  return JSON.parse(content) as T;
}

export async function llm<T extends LlmTask>(args: T): Promise<LlmResult<T['task']>> {
  if (isMockMode()) {
    switch (args.task) {
      case 'ocr':
        return mocks.mockOcr() as LlmResult<T['task']>;
      case 'followup':
        return mocks.mockFollowup(args.turnIndex) as LlmResult<T['task']>;
      case 'report':
        return mocks.mockReport(args.analytics) as LlmResult<T['task']>;
      case 'whatif':
        return mocks.mockWhatIf(args.question, args.report) as LlmResult<T['task']>;
    }
  }

  switch (args.task) {
    case 'ocr': {
      const resp = await getClient().chat.completions.create({
        model: process.env.LLM_MODEL || 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_BM },
          {
            role: 'user',
            content: [
              { type: 'text', text: ocrPrompt() },
              { type: 'image_url', image_url: { url: `data:${args.mimeType};base64,${args.imageBase64}` } },
            ],
          },
        ],
      });
      const parsed = JSON.parse(resp.choices[0]?.message?.content ?? '{}');
      return OcrExtraction.parse(parsed) as LlmResult<T['task']>;
    }
    case 'followup': {
      const raw = await chatJson<unknown>([
        { role: 'system', content: SYSTEM_BM },
        { role: 'user', content: followupPrompt(args.extracted, args.askedSoFar) },
      ]);
      return FollowupTurn.parse(raw) as LlmResult<T['task']>;
    }
    case 'report': {
      const raw = await chatJson<unknown>([
        { role: 'system', content: SYSTEM_BM },
        { role: 'user', content: reportPrompt(args.analytics) },
      ]);
      return ReportNarration.parse(raw) as LlmResult<T['task']>;
    }
    case 'whatif': {
      const raw = await chatJson<unknown>([
        { role: 'system', content: SYSTEM_BM },
        { role: 'user', content: whatIfPrompt(args.report, args.question) },
      ]);
      return WhatIfAnswer.parse(raw) as LlmResult<T['task']>;
    }
  }
}
