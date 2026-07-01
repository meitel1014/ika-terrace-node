import fs from 'node:fs';
import path from 'node:path';
import { JWT } from 'google-auth-library';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import type { SheetRef } from './sheetsConfig';

const CREDENTIALS_DIR = path.resolve(process.cwd(), 'data/credentials');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];

type Log = { warn(...args: unknown[]): void };

/**
 * data/credentials/ 配下の最初の .json ファイルパスを返す。
 * ファイル名は問わない。見つからない場合は null。
 * ここではパスのみを扱い、鍵の中身は読み取らない。
 */
export function findCredentialsFile(log: Log): string | null {
  if (!fs.existsSync(CREDENTIALS_DIR)) {
    log.warn('[googleSheetsClient] data/credentials/ が見つかりません');
    return null;
  }
  const jsonFile = fs.readdirSync(CREDENTIALS_DIR).find((f) => f.endsWith('.json'));
  if (!jsonFile) {
    log.warn('[googleSheetsClient] data/credentials/ 配下に鍵JSONファイルが見つかりません');
    return null;
  }
  return path.join(CREDENTIALS_DIR, jsonFile);
}

/**
 * サービスアカウント鍵ファイルのパスから認証済み JWT クライアントを作成する。
 *
 * google-auth-library@10.9.0 は `keyFile` のみを渡すと JWT の `iss` クレームが
 * 補完されず空のまま署名され、Google 側で `invalid_grant: account not found` になる
 * （TokenHandler.processCredentials が `email` は復元するが `iss` を更新し直さないため）。
 * そのため `client_email`（秘匿情報ではない）だけを読み取り `email` として明示的に渡す。
 * 秘密鍵(`private_key`)自体はここでは読み取らず、署名は引き続き `keyFile` 経由でライブラリに委ねる。
 */
export function createGoogleAuth(keyFilePath: string): JWT {
  const { client_email: email } = JSON.parse(fs.readFileSync(keyFilePath, 'utf-8')) as {
    client_email: string;
  };
  return new JWT({ email, keyFile: keyFilePath, scopes: SCOPES });
}

/** 指定スプレッドシートを取得し、loadInfo まで済ませた GoogleSpreadsheet を返す。 */
export async function getSpreadsheet(spreadsheetId: string, auth: JWT): Promise<GoogleSpreadsheet> {
  const doc = new GoogleSpreadsheet(spreadsheetId, auth);
  await doc.loadInfo();
  return doc;
}

/** SheetRef からワークシートを取得する。sheetTitle未指定時は先頭シートを使う。 */
export function resolveWorksheet(doc: GoogleSpreadsheet, ref: SheetRef) {
  if (ref.sheetTitle) {
    const sheet = doc.sheetsByTitle[ref.sheetTitle];
    if (sheet) return sheet;
  }
  return doc.sheetsByIndex[0];
}
