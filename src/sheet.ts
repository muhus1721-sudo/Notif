import { PendingOp, Sale, TicketRow } from './types';

/**
 * Talks to the Apps Script web app inside the shared Google Sheet
 * (google-apps-script/Code.gs). Everything is a POST with the team key in the
 * body, so the key never shows up in a URL.
 */

export type SheetConfig = { sheetUrl: string; teamKey: string };

export type ListResult = { rows: TicketRow[]; sheetUrl: string; sheetId: string };

/**
 * The sheet answered, but said no. `rejected` means only this one change was
 * refused (e.g. the ticket is already sold); otherwise the whole request failed
 * (wrong key, wrong URL). Network failures throw a plain Error instead.
 */
export class SheetError extends Error {
  constructor(
    message: string,
    readonly rejected: boolean = false,
    readonly row?: TicketRow
  ) {
    super(message);
  }
}

const TIMEOUT_MS = 20000;

async function call<T>(config: SheetConfig, body: Record<string, unknown>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(config.sheetUrl.trim(), {
      method: 'POST',
      // text/plain keeps this a "simple" request that Apps Script accepts as is.
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ ...body, key: config.teamKey }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  const text = await response.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    // Apps Script answers with an HTML page when the URL or deployment is wrong.
    throw new SheetError(
      'The sheet link did not answer like the ticket script. Check the web app URL and that it is deployed for "Anyone".'
    );
  }
  if (!data || data.ok !== true) {
    throw new SheetError(String(data?.error ?? 'The sheet refused the change.'), !!data?.rejected, data?.row);
  }
  return data as T;
}

export function isSheetUrl(url: string): boolean {
  return /^https:\/\/script\.google\.com\/.+\/exec\/?$/.test(url.trim());
}

export const listRows = (config: SheetConfig) => call<ListResult>(config, { action: 'list' });

export function sendOp(config: SheetConfig, op: PendingOp): Promise<unknown> {
  switch (op.type) {
    case 'ensure':
      return call(config, { action: 'ensure', serials: op.serials });
    case 'sell':
      return call(config, {
        action: 'sell',
        serial: op.serial,
        sale: op.sale,
        soldAt: op.soldAt,
        force: op.force,
      });
    case 'clear':
      return call(config, { action: 'clear', serial: op.serial });
  }
}

/** A link that downloads the sheet as an Excel file (needs a Google login with access). */
export const excelDownloadUrl = (sheetId: string) =>
  `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;

/* ------------------------------------------------------- local bookkeeping */

export function emptyRow(serial: string): TicketRow {
  return { serial, buyer: '', phone: '', price: '', soldBy: '', soldAt: '', status: 'Unsold' };
}

/** Applies a pending change to a local copy of the rows, as the sheet will. */
export function applyOp(rows: Map<string, TicketRow>, op: PendingOp): void {
  switch (op.type) {
    case 'ensure':
      for (const s of op.serials) if (!rows.has(s)) rows.set(s, emptyRow(s));
      return;
    case 'sell':
      rows.set(op.serial, { serial: op.serial, ...trimSale(op.sale), soldAt: op.soldAt, status: 'Sold' });
      return;
    case 'clear':
      rows.set(op.serial, emptyRow(op.serial));
  }
}

export function trimSale(sale: Sale): Sale {
  return {
    buyer: sale.buyer.trim(),
    phone: sale.phone.trim(),
    price: sale.price.trim(),
    soldBy: sale.soldBy.trim(),
  };
}

/** "2026-10-20 14:05" in the phone's local time. */
export function timestamp(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Excel-friendly CSV of the rows (with a BOM so Excel reads UTF-8 names right). */
export function toCsv(rows: TicketRow[]): string {
  const header = ['Serial', 'Buyer Name', 'Phone', 'Price', 'Sold By', 'Date Sold', 'Status'];
  const cell = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  // Excel drops a phone number's leading zero; ="0300…" makes it keep the text.
  const phone = (v: string) => (/^0\d+$/.test(v) ? `="${v}"` : cell(v));
  const lines = rows.map((r) =>
    [cell(r.serial), cell(r.buyer), phone(r.phone), cell(r.price), cell(r.soldBy), cell(r.soldAt), r.status].join(',')
  );
  return '﻿' + [header.join(','), ...lines].join('\r\n') + '\r\n';
}
