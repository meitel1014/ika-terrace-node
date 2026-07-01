import fs from 'node:fs';
import path from 'node:path';
import { parseCsv } from './csv';

/** ロガーのうち本ファイルで使用する最小限のインターフェース */
type Log = { warn(...args: unknown[]): void };

const WEAPON_ALIASES_CSV_PATH = path.resolve(process.cwd(), 'data/weapon_aliases.csv');

/** data/weapon_aliases.csv を読み、日本語武器名(ja) → 画像ファイル名(id) のMapを構築する。 */
export function loadWeaponAliasMap(): Map<string, string> {
  const map = new Map<string, string>();
  if (!fs.existsSync(WEAPON_ALIASES_CSV_PATH)) {
    return map;
  }

  const rows = parseCsv(fs.readFileSync(WEAPON_ALIASES_CSV_PATH, 'utf-8'));
  if (rows.length === 0) return map;

  const header = rows[0].map((h) => h.trim());
  const idIdx = header.indexOf('id');
  const jaIdx = header.indexOf('ja');
  if (idIdx < 0 || jaIdx < 0) return map;

  for (const row of rows.slice(1)) {
    const ja = (row[jaIdx] ?? '').trim();
    const id = (row[idIdx] ?? '').trim();
    if (ja && id) map.set(ja, id);
  }

  return map;
}

/** カンマ等の区切り文字で複数武器が入った1セルの値を、武器名の配列に分割する。 */
export function splitWeaponNames(raw: string): string[] {
  return raw
    .split(/[,、，]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** 武器名（ja）の配列を、weapon_aliases.csv の id（画像ファイル名）の配列に変換する。未マッチはログ警告のうえ除外する。 */
export function resolveWeaponIds(
  weaponNames: string[],
  aliasMap: Map<string, string>,
  log: Log,
): string[] {
  const ids: string[] = [];
  for (const name of weaponNames) {
    const id = aliasMap.get(name);
    if (id) {
      ids.push(id);
    } else {
      log.warn(`[weaponAliases] 武器名 "${name}" が weapon_aliases.csv に見つかりません`);
    }
  }
  return ids;
}
