import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

const SHEETS_JSON_PATH = path.resolve(process.cwd(), 'data/sheets.json');

const sheetRefSchema = z.object({
  url: z.string(),
  sheetTitle: z.string().optional(),
});

const sheetsConfigSchema = z.object({
  applicationForm: sheetRefSchema,
  playerRegistrationForm: sheetRefSchema,
});

export type SheetRef = {
  spreadsheetId: string;
  sheetTitle?: string;
};

export type SheetsConfig = {
  applicationForm: SheetRef;
  playerRegistrationForm: SheetRef;
};

/** スプレッドシートURLから spreadsheetId を抽出する。一致しない場合は null。 */
function extractSpreadsheetId(url: string): string | null {
  const m = /\/d\/([a-zA-Z0-9_-]+)/.exec(url);
  return m ? m[1] : null;
}

type Log = { warn(...args: unknown[]): void };

/** data/sheets.json を読み、申請フォーム / 選手情報登録フォームの参照情報を返す。読み込み・検証に失敗した場合は null。 */
export function loadSheetsConfig(log: Log): SheetsConfig | null {
  if (!fs.existsSync(SHEETS_JSON_PATH)) {
    log.warn('[sheetsConfig] data/sheets.json が見つかりません');
    return null;
  }

  try {
    const raw = JSON.parse(fs.readFileSync(SHEETS_JSON_PATH, 'utf-8'));
    const parsed = sheetsConfigSchema.parse(raw);

    const applicationFormId = extractSpreadsheetId(parsed.applicationForm.url);
    const playerRegistrationFormId = extractSpreadsheetId(parsed.playerRegistrationForm.url);

    if (!applicationFormId || !playerRegistrationFormId) {
      log.warn('[sheetsConfig] data/sheets.json の url からスプレッドシートIDを抽出できません');
      return null;
    }

    return {
      applicationForm: {
        spreadsheetId: applicationFormId,
        sheetTitle: parsed.applicationForm.sheetTitle,
      },
      playerRegistrationForm: {
        spreadsheetId: playerRegistrationFormId,
        sheetTitle: parsed.playerRegistrationForm.sheetTitle,
      },
    };
  } catch (e) {
    log.warn('[sheetsConfig] data/sheets.json の読み込みに失敗しました:', e);
    return null;
  }
}
