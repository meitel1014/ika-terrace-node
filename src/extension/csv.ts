import { parse } from 'csv-parse/sync';

/**
 * csv-parse を使った CSV パーサ。インターフェース (string → string[][]) は変更なし。
 * weaponAliases.ts / loadInGameNames.ts もこの関数を経由する。
 */
export function parseCsv(input: string): string[][] {
  return parse(input, {
    bom: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as string[][];
}
