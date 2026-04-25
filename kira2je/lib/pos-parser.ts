import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { SalesRow } from './schemas';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PosSystem =
  | 'square-items'
  | 'square-transactions'
  | 'square-summary'
  | 'loyverse-items'
  | 'loyverse-receipts'
  | 'loyverse-summary'
  | 'storehub-best-sellers'
  | 'storehub-daily'
  | 'custom-itemized'
  | 'unknown';

export type ParseResult = {
  system: PosSystem;
  systemLabel: string;
  usable: boolean;           // false = right system detected, wrong report type
  rows: SalesRow[];
  rowCount: number;
  warnings: string[];
  isAggregated: boolean;     // true = period totals, no date per row
  previewHeaders: string[];
  previewRows: Record<string, unknown>[];
};

// ─── Detection ────────────────────────────────────────────────────────────────

function hasAll(headers: string[], required: string[]): boolean {
  const lower = headers.map((h) => h.trim().toLowerCase());
  return required.every((r) => lower.includes(r.toLowerCase()));
}

function detectSystem(headers: string[]): PosSystem {
  // Square — most specific first
  if (hasAll(headers, ['qty', 'token', 'payment id']))           return 'square-items';
  if (hasAll(headers, ['item variation', 'items sold']))          return 'square-summary';
  if (hasAll(headers, ['transaction id', 'card brand']))          return 'square-transactions';
  // Loyverse
  if (hasAll(headers, ['receipt number', 'cashier name', 'net amount'])) return 'loyverse-items';
  if (hasAll(headers, ['average sale', 'gross sales']))           return 'loyverse-summary';
  if (hasAll(headers, ['receipt number', 'receipt type', 'cost of goods'])) return 'loyverse-receipts';
  // StoreHub — header names may include (RM) suffix or not
  if (hasAll(headers, ['total sold', 'sale / item']))             return 'storehub-best-sellers';
  if (hasAll(headers, ['total sold', 'gp (%)']))                  return 'storehub-best-sellers';
  if (hasAll(headers, ['total sold', 'cost / item']))             return 'storehub-best-sellers';
  if (hasAll(headers, ['net sales / transaction', 'rounding']))   return 'storehub-daily';
  if (hasAll(headers, ['total tendered', 'rounding', 'net sales'])) return 'storehub-daily';
  // Custom item-level export (snake_case columns with _rm suffix)
  if (hasAll(headers, ['item_name', 'unit_price_rm', 'quantity'])) return 'custom-itemized';
  if (hasAll(headers, ['item_name', 'unit_price', 'quantity']))    return 'custom-itemized';
  return 'unknown';
}

export const SYSTEM_LABELS: Record<PosSystem, string> = {
  'square-items':          'Square — Items CSV',
  'square-transactions':   'Square — Transactions CSV',
  'square-summary':        'Square — Summary CSV',
  'loyverse-items':        'Loyverse — Receipts by Item',
  'loyverse-receipts':     'Loyverse — Receipts',
  'loyverse-summary':      'Loyverse — Sales Summary',
  'storehub-best-sellers': 'StoreHub — Best Selling Products',
  'storehub-daily':        'StoreHub — Daily Sales',
  'custom-itemized':       'Custom — Item-level Export',
  'unknown':               'Unknown format',
};

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

// ─── Mappers ──────────────────────────────────────────────────────────────────

function mapSquareItems(raw: Record<string, unknown>[]): { rows: SalesRow[]; warnings: string[] } {
  const rows: SalesRow[] = [];
  for (const r of raw) {
    const qty = num(r['Qty']);
    const netSales = num(r['Net Sales']);
    const itemName = str(r['Item']);
    if (!itemName || str(r['Event Type']) === 'Refund') continue;
    rows.push({
      itemName,
      quantity: qty,
      unitPrice: qty > 0 ? netSales / qty : num(r['Gross Sales']) / Math.max(1, qty),
      date: str(r['Date']).slice(0, 10) || undefined,
      category: str(r['Category']) || undefined,
      channel: mapChannel(str(r['Dining Option']) || str(r['Channel'])),
    });
  }
  return { rows, warnings: [] };
}

function mapSquareSummary(raw: Record<string, unknown>[]): { rows: SalesRow[]; warnings: string[] } {
  const rows: SalesRow[] = [];
  for (const r of raw) {
    const sold = num(r['Items Sold']);
    const net = num(r['Net Sales']);
    const itemName = str(r['Item Name']);
    if (!itemName) continue;
    rows.push({
      itemName,
      quantity: sold,
      unitPrice: sold > 0 ? net / sold : 0,
      category: str(r['Category']) || undefined,
    });
  }
  return {
    rows,
    warnings: ['Square Summary CSV — aggregated totals per item, no date per row.'],
  };
}

function mapLoyverseItems(raw: Record<string, unknown>[]): { rows: SalesRow[]; warnings: string[] } {
  const rows: SalesRow[] = [];
  for (const r of raw) {
    const itemName = str(r['Item']);
    if (!itemName || str(r['Receipt type']) === 'Refund') continue;
    rows.push({
      itemName,
      quantity: num(r['Quantity']),
      unitPrice: num(r['Price']),
      date: str(r['Date']).slice(0, 10) || undefined,
      category: str(r['Category']) || undefined,
    });
  }
  return { rows, warnings: [] };
}

function mapStoreHubBestSellers(raw: Record<string, unknown>[]): { rows: SalesRow[]; warnings: string[] } {
  const rows: SalesRow[] = [];
  for (const r of raw) {
    const itemName = str(r['Product Name']);
    if (!itemName) continue;
    // Column name may include "(RM)" suffix depending on export locale
    const salePerItem =
      num(r['Sale / Item (RM)']) ||
      num(r['Sale / Item']) ||
      num(r['Sale/Item (RM)']) ||
      num(r['Sale/Item']);
    rows.push({
      itemName,
      quantity: num(r['Total Sold']),
      unitPrice: salePerItem,
      category: str(r['Category']) || undefined,
    });
  }
  return {
    rows,
    warnings: [
      'StoreHub Best Selling Products is period-aggregated — no date per row. ' +
      'Make sure you set the date filter to your target month in BackOffice before exporting.',
    ],
  };
}

function excelDateToIso(v: unknown): string | undefined {
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

function mapCustomItemized(raw: Record<string, unknown>[]): { rows: SalesRow[]; warnings: string[] } {
  const rows: SalesRow[] = [];
  for (const r of raw) {
    const itemName = str(r['item_name']);
    if (!itemName) continue;
    if (r['is_refunded'] === true || str(r['is_refunded']).toLowerCase() === 'true') continue;
    const unitPrice =
      num(r['unit_price_rm']) ||
      num(r['unit_price']);
    rows.push({
      itemName,
      quantity: num(r['quantity']),
      unitPrice,
      date: excelDateToIso(r['date']) ?? excelDateToIso(r['receipt_datetime']),
      category: str(r['category']) || str(r['item_type']) || undefined,
      channel: mapChannel(str(r['dine_in_takeaway']) || str(r['order_type']) || str(r['channel'])),
    });
  }
  return { rows, warnings: [] };
}

// ─── Non-item-level notices ───────────────────────────────────────────────────

const NOT_ITEM_LEVEL: Partial<Record<PosSystem, string>> = {
  'square-transactions':
    'Square Transactions CSV shows one row per payment, not per item. ' +
    'Re-export using Square Dashboard › Transactions › Items CSV for item-level data.',
  'loyverse-receipts':
    'Loyverse Receipts shows one row per receipt total, not per item. ' +
    'Re-export using "Receipts by item" for item-level data.',
  'loyverse-summary':
    'Loyverse Sales Summary shows daily totals only. ' +
    'Re-export using "Receipts by item" for item-level data.',
  'storehub-daily':
    'StoreHub Daily Sales shows daily revenue totals only — no item names. ' +
    'Use "Best Selling Products" from StoreHub BackOffice › Reports instead.',
};

// ─── Main entry point ─────────────────────────────────────────────────────────

export async function parsePosFile(base64: string, fileName: string): Promise<ParseResult> {
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
      system: 'unknown', systemLabel: 'Unknown format',
      usable: false, rows: [], rowCount: 0, isAggregated: false,
      warnings: [`Unsupported file type: .${ext}. Please upload a CSV or XLSX file.`],
      previewHeaders: [], previewRows: [],
    };
  }

  if (rawRows.length === 0) {
    return {
      system: 'unknown', systemLabel: 'Unknown format',
      usable: false, rows: [], rowCount: 0, isAggregated: false,
      warnings: ['File appears to be empty or could not be parsed.'],
      previewHeaders: [], previewRows: [],
    };
  }

  const headers = Object.keys(rawRows[0]);
  const system = detectSystem(headers);

  const isAggregated = system === 'storehub-best-sellers'
    || system === 'square-summary'
    || system === 'loyverse-summary';

  // Non-item-level: recognised but wrong report
  const notItemLevel = NOT_ITEM_LEVEL[system];
  if (notItemLevel) {
    return {
      system, systemLabel: SYSTEM_LABELS[system],
      usable: false, rows: [], rowCount: rawRows.length,
      isAggregated: false,
      warnings: [notItemLevel],
      previewHeaders: headers.slice(0, 6),
      previewRows: rawRows.slice(0, 5),
    };
  }

  if (system === 'unknown') {
    return {
      system, systemLabel: SYSTEM_LABELS[system],
      usable: false, rows: [], rowCount: rawRows.length,
      isAggregated: false,
      warnings: [
        'Could not identify the POS system from the column headers.',
        `Columns found: ${headers.slice(0, 8).join(', ')}${headers.length > 8 ? ' …' : ''}`,
        'Supported formats: Square Items CSV, Loyverse Receipts by Item, StoreHub Best Selling Products.',
      ],
      previewHeaders: headers.slice(0, 6),
      previewRows: rawRows.slice(0, 5),
    };
  }

  // Map to SalesRow
  let mapped: { rows: SalesRow[]; warnings: string[] };
  if (system === 'square-items')           mapped = mapSquareItems(rawRows);
  else if (system === 'square-summary')    mapped = mapSquareSummary(rawRows);
  else if (system === 'loyverse-items')    mapped = mapLoyverseItems(rawRows);
  else if (system === 'custom-itemized')   mapped = mapCustomItemized(rawRows);
  else                                     mapped = mapStoreHubBestSellers(rawRows);

  // Preview: pick the most relevant columns (up to 5)
  const previewColPriority: Partial<Record<PosSystem, string[]>> = {
    'square-items':          ['Date', 'Item', 'Category', 'Qty', 'Net Sales', 'Dining Option'],
    'square-summary':        ['Item Name', 'Category', 'Items Sold', 'Net Sales'],
    'loyverse-items':        ['Date', 'Item', 'Category', 'Quantity', 'Price'],
    'storehub-best-sellers': ['Product Name', 'Category', 'Total Sold', 'Total Sales (RM)', 'Sale / Item (RM)', 'GP (%)'],
    'custom-itemized':       ['date', 'item_name', 'category', 'quantity', 'unit_price_rm', 'dine_in_takeaway'],
  };
  const wantedCols = previewColPriority[system] ?? headers.slice(0, 6);
  const previewHeaders = wantedCols.filter((c) => headers.includes(c));

  return {
    system,
    systemLabel: SYSTEM_LABELS[system],
    usable: true,
    rows: mapped.rows,
    rowCount: mapped.rows.length,
    warnings: mapped.warnings,
    isAggregated,
    previewHeaders,
    previewRows: rawRows.slice(0, 5),
  };
}
