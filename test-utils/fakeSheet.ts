import { readFileSync } from 'fs';
import { join } from 'path';
import vm from 'vm';

/**
 * Runs the real google-apps-script/Code.gs against an in-memory spreadsheet
 * with just enough of the Apps Script API to behave like the real thing.
 */
export function loadScript(teamKey = 'secret') {
  const data: unknown[][] = [];

  const display = (v: unknown) => (v === undefined || v === null ? '' : String(v));

  const range = (row: number, col: number, rows: number, cols: number) => ({
    getDisplayValues: () =>
      Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => display(data[row - 1 + r]?.[col - 1 + c]))
      ),
    setValues(values: unknown[][]) {
      values.forEach((vals, r) => {
        const target = (data[row - 1 + r] ??= []);
        vals.forEach((v, c) => (target[col - 1 + c] = v));
      });
      return this;
    },
    setFontWeight() {
      return this;
    },
  });

  const spreadsheet: any = {
    getUrl: () => 'https://docs.google.com/spreadsheets/d/SHEET123/edit',
    getId: () => 'SHEET123',
    getSheetByName: () => sheet,
    insertSheet: () => sheet,
  };
  const sheet: any = {
    getLastRow: () => data.length,
    getRange: (a: number | string, b = 1, c = 1, d = 1) =>
      typeof a === 'string' ? { setNumberFormat: () => undefined } : range(a, b, c, d),
    setFrozenRows: () => undefined,
    getParent: () => spreadsheet,
  };

  const context: any = {
    SpreadsheetApp: { getActiveSpreadsheet: () => spreadsheet },
    LockService: { getScriptLock: () => ({ waitLock: () => undefined, releaseLock: () => undefined }) },
    ContentService: {
      MimeType: { JSON: 'json' },
      createTextOutput: (text: string) => ({ text, setMimeType() { return this; } }),
    },
  };
  const source = readFileSync(join(__dirname, '..', 'google-apps-script', 'Code.gs'), 'utf8').replace(
    "const TEAM_KEY = 'change-me';",
    `const TEAM_KEY = '${teamKey}';`
  );
  vm.createContext(context);
  vm.runInContext(source, context);

  /** What the web app would answer to a POST with this JSON body. */
  const post = (body: unknown): any => JSON.parse(context.doPost({ postData: { contents: JSON.stringify(body) } }).text);

  return { data, post };
}

/** Routes fetch() to the fake script, the way a deployed web app would answer. */
export function fetchFor(script: ReturnType<typeof loadScript>) {
  return jest.fn(async (_url: string, init: { body: string }) => {
    const answer = script.post(JSON.parse(init.body));
    return { text: async () => JSON.stringify(answer) } as Response;
  });
}
