import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { SalesRow, PosColumnMapping } from './schemas';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function num(v: unknown): number {
  if (typeof v === 'number') return isNaN(v) ? 0 : v;
  if (typeof v === 'string') return parseFloat(v.replace(/[^0-9.-]/g, '')) || 0;
  return 0;
}

function str(v: unknown): string {
  return v == null ? '' : String(v).trim();
}

function mapChannel(v: string | undefined): string | undefined {
  if (!v) return undefined;
  const lo = v.toLowerCase();
  if (lo.includes('dine') || lo.includes('eat in') || lo.includes('in-store')) return 'dine-in';
  if (lo.includes('take') || lo.includes('carry') || lo.includes('self'))       return 'takeaway';
  if (lo.includes('grab') || lo.includes('panda') || lo.includes('deliv') || lo.includes('beep')) return 'delivery';
  if (lo.includes('online') || lo.includes('web'))                               return 'online';
  return v;
}

export function excelDateToIso(v: unknown): string | undefined {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'number' && v > 0) {
    // Excel serial: days since 1899-12-30 (accounts for the 1900 leap-year bug)
    const ms = (v - 25569) * 86400 * 1000;
    const d = new Date(ms);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  if (typeof v === 'string' && v.length >= 8) return v.slice(0, 10);
  return undefined;
}

// ─── Raw row extraction ───────────────────────────────────────────────────────

export async function extractRawRows(base64: string, fileName: string): Promise<Record<string, unknown>[]> {
  const buffer = Buffer.from(base64, 'base64');
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';

  if (ext === 'csv') {
    const text = buffer.toString('utf-8');
    const result = Papa.parse<Record<string, unknown>>(text, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
    });
    return result.data;
  } else if (ext === 'xlsx' || ext === 'xls') {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  }
  return [];
}

// ─── Simplified file parser (headers + preview only) ─────────────────────────

export async function parsePosFile(base64: string, fileName: string): Promise<{
  ok: boolean;
  error?: string;
  headers: string[];
  previewRows: Record<string, unknown>[];
  totalRows: number;
}> {
  const buffer = Buffer.from(base64, 'base64');
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';

  let rawRows: Record<string, unknown>[] = [];

  if (ext === 'csv') {
    const text = buffer.toString('utf-8');
    const result = Papa.parse<Record<string, unknown>>(text, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
    });
    rawRows = result.data;
  } else if (ext === 'xlsx' || ext === 'xls') {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  } else {
    return {
      ok: false,
      error: `Unsupported file type: .${ext}. Please upload a CSV or XLSX file.`,
      headers: [],
      previewRows: [],
      totalRows: 0,
    };
  }

  if (rawRows.length === 0) {
    return {
      ok: false,
      error: 'File appears to be empty or could not be parsed.',
      headers: [],
      previewRows: [],
      totalRows: 0,
    };
  }

  const headers = Object.keys(rawRows[0]);
  return {
    ok: true,
    headers,
    previewRows: rawRows.slice(0, 5),
    totalRows: rawRows.length,
  };
}

// ─── Month grouping ───────────────────────────────────────────────────────────

export function groupRowsByMonth(rows: SalesRow[], fallbackMonth: string): Map<string, SalesRow[]> {
  const map = new Map<string, SalesRow[]>();
  for (const row of rows) {
    const month = row.date ? row.date.slice(0, 7) : fallbackMonth;
    const arr = map.get(month) ?? [];
    arr.push(row);
    map.set(month, arr);
  }
  return map;
}

export function detectMonths(rows: SalesRow[]): string[] {
  const months = new Set<string>();
  for (const row of rows) {
    if (row.date) months.add(row.date.slice(0, 7));
  }
  return [...months].sort();
}

// ─── Row aggregation ──────────────────────────────────────────────────────────

export function aggregateSalesRows(rows: SalesRow[]): SalesRow[] {
  const map = new Map<string, { qty: number; revenue: number; category?: string; channel?: string }>();
  for (const r of rows) {
    const key = r.itemName;
    const existing = map.get(key);
    if (existing) {
      existing.qty += r.quantity;
      existing.revenue += r.quantity * r.unitPrice;
    } else {
      map.set(key, {
        qty: r.quantity,
        revenue: r.quantity * r.unitPrice,
        category: r.category,
        channel: r.channel,
      });
    }
  }
  return Array.from(map.entries()).map(([itemName, v]) => ({
    itemName,
    quantity: v.qty,
    unitPrice: v.qty > 0 ? v.revenue / v.qty : 0,
    category: v.category,
    channel: v.channel,
  }));
}

// ─── LLM column mapping → SalesRow[] ─────────────────────────────────────────

export function mapFromColumnMapping(
  rawRows: Record<string, unknown>[],
  mapping: PosColumnMapping
): { rows: SalesRow[]; warnings: string[] } {
  const rows: SalesRow[] = [];
  const warnings: string[] = [];

  if (!mapping.itemNameCol || !mapping.quantityCol || !mapping.unitPriceCol) {
    warnings.push('AI column mapping is incomplete — could not find item name, quantity, or price columns.');
    return { rows, warnings };
  }

  for (const r of rawRows) {
    const itemName = str(r[mapping.itemNameCol]);
    if (!itemName) continue;
    if (mapping.isRefundedCol) {
      const refVal = r[mapping.isRefundedCol];
      if (refVal === true || str(refVal).toLowerCase() === 'true') continue;
    }
    const quantity = num(r[mapping.quantityCol]);
    const unitPrice = num(r[mapping.unitPriceCol]);
    const date = mapping.dateCol
      ? (excelDateToIso(r[mapping.dateCol]) ?? undefined)
      : undefined;
    const category = mapping.categoryCol ? str(r[mapping.categoryCol]) || undefined : undefined;
    const channel = mapping.channelCol ? mapChannel(str(r[mapping.channelCol])) : undefined;
    rows.push({ itemName, quantity, unitPrice, date, category, channel });
  }

  if (mapping.confidence !== 'high') {
    warnings.push(
      `AI detected columns with ${mapping.confidence} confidence — please verify the preview looks correct.`
    );
  }

  return { rows, warnings };
}
