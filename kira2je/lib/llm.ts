import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import { createWorker } from 'tesseract.js';
import {
  InvoiceOcrResult,
  IngredientMappingResult,
  ReportData,
  MonthView,
  TrendsView,
  WhatIfAnswer,
  PosColumnMapping,
} from './schemas';
import {
  systemPrompt,
  invoiceOcrPrompt,
  ingredientMappingPrompt,
  reportPrompt,
  reportMonthViewPrompt,
  reportTrendsViewPrompt,
  whatIfPrompt,
  posColumnMappingPrompt,
} from './prompts';
import * as mocks from './mocks';
import type { Locale } from './i18n/dictionary';

type LlmTask =
  | { task: 'invoice-ocr'; imageBase64: string; mimeType: string; locale?: Locale }
  | { task: 'ingredient-mapping'; invoiceItems: unknown[]; menuItems: string[]; savedMappings: unknown[]; locale?: Locale }
  | { task: 'report'; salesData: unknown; expenseData: unknown; mappings: unknown; historicalData: unknown; locale?: Locale }
  | { task: 'report-month'; salesData: unknown; expenseData: unknown; mappings: unknown; menuItemOverrides?: unknown; locale?: Locale }
  | { task: 'report-trends'; currentMonthSummary: unknown; historicalData: unknown; locale?: Locale }
  | { task: 'whatif'; monthView: unknown; trendsView: unknown; question: string; locale?: Locale }
  | { task: 'pos-column-mapping'; headers: string[]; sampleRows: Record<string, unknown>[] };

export type LlmResult<T extends LlmTask['task']> = T extends 'invoice-ocr'
  ? InvoiceOcrResult
  : T extends 'ingredient-mapping'
    ? IngredientMappingResult
    : T extends 'report'
      ? ReportData
      : T extends 'report-month'
        ? MonthView
        : T extends 'report-trends'
          ? TrendsView
          : T extends 'whatif'
            ? WhatIfAnswer
            : T extends 'pos-column-mapping'
              ? PosColumnMapping
              : never;

function isMockMode(): boolean {
  return (process.env.MOCK_LLM ?? 'true').toLowerCase() === 'true' || !process.env.LLM_API_KEY;
}

let client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      baseURL: process.env.LLM_BASE_URL || 'https://api.ilmu.ai/v1',
      apiKey: process.env.LLM_API_KEY || 'missing-key',
      timeout: 25000,
      maxRetries: 0,
    });
  }
  return client;
}

async function callGeminiModel(model: string, imageBase64: string, mimeType: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          { text: 'Describe all text, numbers, dates, supplier names, and line items visible in this invoice or receipt. Be specific — include every item description, quantity, unit, price, and total you can read.' },
          { inlineData: { mimeType, data: imageBase64 } },
        ],
      },
    ],
  });
  const text = response.text;
  if (!text) throw new Error('Gemini returned empty response');
  return text;
}

async function describeWithGemini(imageBase64: string, mimeType: string): Promise<string> {
  const primaryModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const fallbackModels = primaryModel === 'gemini-2.5-flash' ? ['gemini-2.5-flash-lite'] : [];
  try {
    return await withRetry(() => callGeminiModel(primaryModel, imageBase64, mimeType), `gemini-${primaryModel}`, 3);
  } catch (primaryErr) {
    for (const fallback of fallbackModels) {
      console.warn(`[llm:ocr-gemini] primary failed, trying ${fallback}:`, (primaryErr as Error)?.message);
      try {
        return await withRetry(() => callGeminiModel(fallback, imageBase64, mimeType), `gemini-${fallback}`, 2);
      } catch { /* try next */ }
    }
    throw primaryErr;
  }
}

async function preprocessImage(imageBase64: string, rotateDeg: number): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Jimp } = require('jimp');
  const raw = Buffer.from(imageBase64, 'base64');
  const img = await Jimp.fromBuffer(raw);
  img.greyscale().contrast(0.5);
  if (rotateDeg > 0) img.rotate(rotateDeg);
  return img.getBuffer('image/jpeg');
}

async function runTesseract(buf: Buffer): Promise<{ text: string; confidence: number }> {
  const worker = await createWorker('eng', 1, { logger: () => {} });
  try {
    await worker.setParameters({ tessedit_pageseg_mode: '6' as Parameters<typeof worker.setParameters>[0]['tessedit_pageseg_mode'] });
    const result = await worker.recognize(buf);
    return { text: result.data.text, confidence: result.data.confidence };
  } finally {
    await worker.terminate();
  }
}

async function extractPdfText(pdfBase64: string): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse/lib/pdf-parse.js');
  const buf = Buffer.from(pdfBase64, 'base64');
  const data = await pdfParse(buf);
  if (!data.text?.trim()) throw new Error('PDF has no extractable text');
  return data.text;
}

async function describeWithTesseract(imageBase64: string): Promise<{ text: string; confidence: number }> {
  const [orig, rot90] = await Promise.all([preprocessImage(imageBase64, 0), preprocessImage(imageBase64, 90)]);
  const [r0, r90] = await Promise.all([runTesseract(orig), runTesseract(rot90)]);
  const best = r0.confidence >= r90.confidence ? r0 : r90;
  console.warn(`[llm:tesseract] confidence: 0°=${r0.confidence.toFixed(0)}% 90°=${r90.confidence.toFixed(0)}% — using ${r0.confidence >= r90.confidence ? '0°' : '90°'}`);
  return best;
}

async function describeWithOpenAIVision(imageBase64: string, mimeType: string): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resp = await (getClient().chat.completions.create as any)({
    model: process.env.LLM_MODEL || 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Describe all text, numbers, dates, supplier names, and line items visible in this invoice or receipt. Include every item description, quantity, unit, price, and total you can read.',
          },
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${imageBase64}`, detail: 'high' },
          },
        ],
      },
    ],
  });
  const text = resp.choices[0]?.message?.content;
  if (!text) throw new Error('OpenAI vision returned empty response');
  return text;
}

async function withRetry<T>(fn: () => Promise<T>, label: string, maxAttempts = 2): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e: unknown) {
      lastErr = e;
      const status = (e as { status?: number })?.status;
      const retryable = typeof status === 'number' && status >= 500 && status < 600;
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

function extractJson(content: string): unknown {
  const trimmed = content.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (match) return JSON.parse(match[1]);
  return JSON.parse(trimmed);
}

async function chatJson<T>(messages: OpenAI.Chat.ChatCompletionMessageParam[], label: string): Promise<T> {
  const resp = await withRetry(
    () => getClient().chat.completions.create({
      model: process.env.LLM_MODEL || 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages,
    }),
    label
  );
  const content = resp.choices[0]?.message?.content ?? '{}';
  return extractJson(content) as T;
}

function mockFor<T extends LlmTask>(args: T): LlmResult<T['task']> {
  switch (args.task) {
    case 'invoice-ocr':
      return mocks.mockInvoiceOcr() as LlmResult<T['task']>;
    case 'ingredient-mapping':
      return mocks.mockMappingResult() as LlmResult<T['task']>;
    case 'report':
      return mocks.mockReportData() as LlmResult<T['task']>;
    case 'whatif':
      return mocks.mockWhatIf(args.question) as LlmResult<T['task']>;
    case 'report-month':
      return mocks.mockReportData().monthView as LlmResult<T['task']>;
    case 'report-trends':
      return mocks.mockReportData().trendsView as LlmResult<T['task']>;
    case 'pos-column-mapping':
      throw new Error('pos-column-mapping has no mock');
    default:
      throw new Error('unreachable');
  }
}

export async function llm<T extends LlmTask>(args: T): Promise<LlmResult<T['task']>> {
  const locale: Locale = ('locale' in args ? args.locale : undefined) ?? 'en';

  if (isMockMode()) {
    return mockFor(args);
  }

  try {
    return await callReal(args, locale);
  } catch (e) {
    const msg = (e as Error)?.message ?? String(e);
    console.error(`[llm:${args.task}] real provider failed:`, msg);
    // Don't silently fall back to mock when MOCK_LLM=false — surface the error
    // so callers can show a real error message instead of returning stale data.
    throw e;
  }
}

async function callReal<T extends LlmTask>(args: T, locale: Locale): Promise<LlmResult<T['task']>> {
  const sys = systemPrompt(locale);

  switch (args.task) {
    case 'invoice-ocr': {
      let imageText: string;
      let tesseractConfidence: number | null = null;

      if (args.mimeType === 'application/pdf') {
        try {
          imageText = await extractPdfText(args.imageBase64);
          console.log('[llm:invoice-ocr] PDF text extracted directly');
        } catch (pdfErr) {
          throw new Error(`PDF text extraction failed: ${(pdfErr as Error)?.message}`);
        }
      } else {
        try {
          imageText = await describeWithGemini(args.imageBase64, args.mimeType);
        } catch (geminiErr) {
          console.warn('[llm:invoice-ocr] Gemini failed, trying OpenAI vision:', (geminiErr as Error)?.message);
          try {
            imageText = await describeWithOpenAIVision(args.imageBase64, args.mimeType);
            console.log('[llm:invoice-ocr] OpenAI vision succeeded');
          } catch (visionErr) {
            console.warn('[llm:invoice-ocr] OpenAI vision failed, falling back to tesseract:', (visionErr as Error)?.message);
            const tResult = await describeWithTesseract(args.imageBase64);
            imageText = tResult.text;
            tesseractConfidence = tResult.confidence;
          }
        }
      }
      const isNoisy = tesseractConfidence !== null && tesseractConfidence < 60;
      const raw = await chatJson<unknown>(
        [
          { role: 'system', content: sys },
          { role: 'user', content: `${invoiceOcrPrompt(locale, isNoisy)}\n\nInvoice content:\n${imageText}` },
        ],
        'invoice-ocr'
      );
      return InvoiceOcrResult.parse(raw) as LlmResult<T['task']>;
    }

    case 'ingredient-mapping': {
      const raw = await chatJson<unknown>(
        [
          { role: 'system', content: sys },
          { role: 'user', content: ingredientMappingPrompt(args.invoiceItems, args.menuItems, args.savedMappings, locale) },
        ],
        'ingredient-mapping'
      );
      return IngredientMappingResult.parse(raw) as LlmResult<T['task']>;
    }

    case 'report': {
      const raw = await chatJson<unknown>(
        [
          { role: 'system', content: sys },
          { role: 'user', content: reportPrompt(args.salesData, args.expenseData, args.mappings, args.historicalData, locale) },
        ],
        'report'
      );
      return ReportData.parse(raw) as LlmResult<T['task']>;
    }

    case 'whatif': {
      const raw = await chatJson<unknown>(
        [
          { role: 'system', content: sys },
          { role: 'user', content: whatIfPrompt(args.monthView, args.trendsView, args.question, locale) },
        ],
        'whatif'
      );
      return WhatIfAnswer.parse(raw) as LlmResult<T['task']>;
    }

    case 'report-month': {
      const raw = await chatJson<unknown>(
        [
          { role: 'system', content: sys },
          { role: 'user', content: reportMonthViewPrompt(args.salesData, args.expenseData, args.mappings, locale, args.menuItemOverrides) },
        ],
        'report-month'
      );
      return MonthView.parse(raw) as LlmResult<T['task']>;
    }

    case 'report-trends': {
      const raw = await chatJson<unknown>(
        [
          { role: 'system', content: sys },
          { role: 'user', content: reportTrendsViewPrompt(args.currentMonthSummary, args.historicalData, locale) },
        ],
        'report-trends'
      );
      return TrendsView.parse(raw) as LlmResult<T['task']>;
    }

    case 'pos-column-mapping': {
      const raw = await chatJson<unknown>(
        [
          { role: 'system', content: sys },
          { role: 'user', content: posColumnMappingPrompt(args.headers, args.sampleRows) },
        ],
        'pos-column-mapping'
      );
      return PosColumnMapping.parse(raw) as LlmResult<T['task']>;
    }

    default:
      throw new Error('unreachable');
  }
}
