/**
 * Welcome Event Tickets — the shared sales sheet.
 *
 * Paste this whole file into Extensions → Apps Script of your Google Sheet,
 * change TEAM_KEY below, and deploy it as a web app (see README.md, "Connect
 * the Google Sheet"). Every phone running the app then reads and writes this
 * one sheet, so everyone sees the same sales.
 */

/** A password the app must send. Change it, and give it only to your sellers. */
const TEAM_KEY = 'change-me';

const SHEET_NAME = 'Tickets';
const HEADERS = ['Serial', 'Buyer Name', 'Phone', 'Price', 'Sold By', 'Date Sold', 'Status'];
const COL = { serial: 0, buyer: 1, phone: 2, price: 3, soldBy: 4, soldAt: 5, status: 6 };

function doPost(e) {
  let request;
  try {
    request = JSON.parse(e.postData.contents);
  } catch (err) {
    return reply({ ok: false, error: 'Bad request.' });
  }
  if (!request || request.key !== TEAM_KEY) {
    return reply({ ok: false, error: 'Wrong team key.' });
  }

  // One change at a time, so two sellers can never both sell the same ticket.
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    return reply(handle(request));
  } catch (err) {
    return reply({ ok: false, error: String((err && err.message) || err) });
  } finally {
    lock.releaseLock();
  }
}

/** Opening the web app URL in a browser shows this, which proves it is deployed. */
function doGet() {
  return reply({ ok: true, message: 'Welcome Event Tickets sheet is live. Use the app to connect.' });
}

function handle(request) {
  const sheet = getSheet();
  switch (request.action) {
    case 'list':
      return { ok: true, rows: readRows(sheet), sheetUrl: sheet.getParent().getUrl(), sheetId: sheet.getParent().getId() };
    case 'ensure':
      return { ok: true, added: ensureRows(sheet, request.serials || []) };
    case 'sell':
      return sell(sheet, request);
    case 'clear':
      return clearSale(sheet, request.serial);
    default:
      return { ok: false, error: 'Unknown action.' };
  }
}

/** Finds or creates the Tickets tab, with headers and text-formatted columns. */
function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
    sheet.setFrozenRows(1);
    // Plain text keeps phone numbers' leading zeros and stops Sheets from
    // reinterpreting serials or dates. Price stays a number so it can be summed.
    sheet.getRange('A:C').setNumberFormat('@');
    sheet.getRange('E:G').setNumberFormat('@');
  }
  return sheet;
}

function readRows(sheet) {
  const last = sheet.getLastRow();
  if (last < 2) return [];
  return sheet
    .getRange(2, 1, last - 1, HEADERS.length)
    .getDisplayValues()
    .filter(function (r) { return r[COL.serial]; })
    .map(toRow);
}

function toRow(r) {
  return {
    serial: String(r[COL.serial]),
    buyer: String(r[COL.buyer]),
    phone: String(r[COL.phone]),
    price: String(r[COL.price]),
    soldBy: String(r[COL.soldBy]),
    soldAt: String(r[COL.soldAt]),
    status: r[COL.status] === 'Sold' ? 'Sold' : 'Unsold',
  };
}

/** Sheet row number (1-based) for each serial already in the sheet. */
function indexSerials(sheet) {
  const index = {};
  const last = sheet.getLastRow();
  if (last < 2) return index;
  const serials = sheet.getRange(2, 1, last - 1, 1).getDisplayValues();
  for (let i = 0; i < serials.length; i++) {
    if (serials[i][0]) index[serials[i][0]] = i + 2;
  }
  return index;
}

/** Adds an Unsold row for each serial the sheet does not have yet. */
function ensureRows(sheet, serials) {
  const index = indexSerials(sheet);
  const fresh = [];
  const seen = {};
  serials.forEach(function (s) {
    if (s && !index[s] && !seen[s]) {
      seen[s] = true;
      fresh.push([s, '', '', '', '', '', 'Unsold']);
    }
  });
  if (fresh.length) {
    sheet.getRange(sheet.getLastRow() + 1, 1, fresh.length, HEADERS.length).setValues(fresh);
  }
  return fresh.length;
}

function priceValue(price) {
  const text = String(price || '').trim();
  return text !== '' && !isNaN(Number(text)) ? Number(text) : text;
}

/**
 * Records a sale. If someone else already sold this ticket the sale is refused
 * and the existing buyer is returned, unless `force` says to overwrite it
 * (used when editing a sale on purpose).
 *
 * `rejected` marks a refusal of this one change, as opposed to the whole
 * request failing (wrong key, broken sheet): the app drops the change and
 * carries on with the rest of its queue.
 */
function sell(sheet, request) {
  const serial = request.serial;
  const sale = request.sale || {};
  if (!serial) return { ok: false, rejected: true, error: 'Missing serial.' };
  if (!String(sale.buyer || '').trim()) return { ok: false, rejected: true, error: 'Buyer name is required.' };

  let rowNum = indexSerials(sheet)[serial];
  if (!rowNum) {
    ensureRows(sheet, [serial]);
    rowNum = indexSerials(sheet)[serial];
  }

  const range = sheet.getRange(rowNum, 1, 1, HEADERS.length);
  const current = toRow(range.getDisplayValues()[0]);
  if (current.status === 'Sold' && !request.force) {
    return { ok: false, rejected: true, row: current, error: serial + ' is already sold to ' + current.buyer + '.' };
  }

  range.setValues([[
    serial,
    String(sale.buyer).trim(),
    String(sale.phone || '').trim(),
    priceValue(sale.price),
    String(sale.soldBy || '').trim(),
    request.soldAt || '',
    'Sold',
  ]]);
  return { ok: true, row: toRow(range.getDisplayValues()[0]) };
}

/** Puts a ticket back to Unsold and wipes the buyer's details. */
function clearSale(sheet, serial) {
  const rowNum = indexSerials(sheet)[serial];
  if (!rowNum) return { ok: true };
  sheet.getRange(rowNum, 1, 1, HEADERS.length).setValues([[serial, '', '', '', '', '', 'Unsold']]);
  return { ok: true };
}

function reply(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
}
