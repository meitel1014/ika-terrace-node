import fs from 'node:fs';
import path from 'node:path';
import { parseCsv } from './csv';
import type { TeamsPool, Team } from '../schemas';

const CSV_PATH = path.resolve(process.cwd(), 'data/teams.csv');

const MODE_LABEL_TO_KEY: Record<string, 'turfWar' | 'splatZones'> = {
  ナワバリトーナメント: 'turfWar',
  エリアトーナメント: 'splatZones',
};

/**
 * 半角数字 / 全角数字 / 丸数字のいずれかを列名に含む列のインデックスを返す。
 * 申請フォームによる表記揺れに対応するため柔軟に検出する。
 */
const PLAYER_DIGITS = [
  ['1', '１', '①'],
  ['2', '２', '②'],
  ['3', '３', '③'],
  ['4', '４', '④'],
] as const;

function findPlayerColumnIndex(header: string[], playerNum: 0 | 1 | 2 | 3): number {
  const digits = PLAYER_DIGITS[playerNum];
  return header.findIndex((h) => digits.some((d) => h.includes(d)));
}

/**
 * data/teams.csv を読んで TeamsPool を構築する。
 *
 * - `id`      : データ行の上から順の連番文字列 ("1", "2", ...)
 * - `name`    : `チーム名` 列の値（CSV 原本、不変キー）
 * - `viewname`: `チーム名(表示用)` 列の値。列がなければ name と同値
 * - `alias`   : `二つ名` 列の値
 * - `players` : 数字を含む列名で柔軟検出（半角/全角/丸数字に対応）
 *
 * `ルール` 列がない場合は全チームを turfWar と splatZones の両方に追加する。
 * ファイルが存在しない場合は空の TeamsPool を返す。
 */
export function loadTeamsPoolFromCsv(): TeamsPool {
  if (!fs.existsSync(CSV_PATH)) {
    return { turfWar: [], splatZones: [] };
  }

  let raw: string;
  try {
    raw = fs.readFileSync(CSV_PATH, 'utf-8');
  } catch (e) {
    console.error(`[loadTeams] Failed to read ${CSV_PATH}:`, e);
    return { turfWar: [], splatZones: [] };
  }

  const rows = parseCsv(raw);
  if (rows.length === 0) {
    return { turfWar: [], splatZones: [] };
  }

  const header = rows[0].map((h) => h.trim());

  const idx = {
    mode:     header.indexOf('ルール'),
    name:     header.indexOf('チーム名'),
    viewname: header.indexOf('チーム名(表示用)'),
    alias:    header.indexOf('二つ名'),
    players: [
      findPlayerColumnIndex(header, 0),
      findPlayerColumnIndex(header, 1),
      findPlayerColumnIndex(header, 2),
      findPlayerColumnIndex(header, 3),
    ] as [number, number, number, number],
  };

  const noRuleColumn = idx.mode < 0;
  const pool: TeamsPool = { turfWar: [], splatZones: [] };
  let serial = 0;

  for (const row of rows.slice(1)) {
    const rawName = idx.name >= 0 ? (row[idx.name] ?? '').trim() : '';
    if (rawName === '') continue;

    serial++;
    const rawViewname = idx.viewname >= 0 ? (row[idx.viewname] ?? '').trim() : '';

    const team: Team = {
      id:       String(serial),
      name:     rawName,
      viewname: rawViewname || rawName,
      alias:    idx.alias >= 0 ? (row[idx.alias] ?? '').trim() : '',
      players: [
        idx.players[0] >= 0 ? (row[idx.players[0]] ?? '').trim() : '',
        idx.players[1] >= 0 ? (row[idx.players[1]] ?? '').trim() : '',
        idx.players[2] >= 0 ? (row[idx.players[2]] ?? '').trim() : '',
        idx.players[3] >= 0 ? (row[idx.players[3]] ?? '').trim() : '',
      ],
    };

    if (noRuleColumn) {
      pool.turfWar.push(team);
      pool.splatZones.push(team);
    } else {
      const modeLabel = (row[idx.mode] ?? '').trim();
      const modeKey = MODE_LABEL_TO_KEY[modeLabel];
      if (modeKey) {
        pool[modeKey].push(team);
      }
    }
  }

  return pool;
}
