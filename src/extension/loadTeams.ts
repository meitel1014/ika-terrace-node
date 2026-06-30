import fs from 'node:fs';
import path from 'node:path';
import { parseCsv } from './csv';
import type { TeamsPool, Team } from '../schemas';

const CSV_PATH = path.resolve(process.cwd(), 'data/teams.csv');

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
 * CSV テキストを直接受け取って TeamsPool を構築する。
 * ファイルには書き込まない。
 */
export function parseTeamsPoolFromCsvText(raw: string): TeamsPool {
  const rows = parseCsv(raw);
  if (rows.length === 0) {
    return [];
  }

  const header = rows[0].map((h) => h.trim());

  const idx = {
    name:     header.indexOf('チーム名'),
    viewname: header.indexOf('チーム名(表示用)'),
    players: [
      findPlayerColumnIndex(header, 0),
      findPlayerColumnIndex(header, 1),
      findPlayerColumnIndex(header, 2),
      findPlayerColumnIndex(header, 3),
    ] as [number, number, number, number],
  };

  const pool: TeamsPool = [];
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
      players: [
        idx.players[0] >= 0 ? (row[idx.players[0]] ?? '').trim() : '',
        idx.players[1] >= 0 ? (row[idx.players[1]] ?? '').trim() : '',
        idx.players[2] >= 0 ? (row[idx.players[2]] ?? '').trim() : '',
        idx.players[3] >= 0 ? (row[idx.players[3]] ?? '').trim() : '',
      ],
    };

    pool.push(team);
  }

  return pool;
}

/** data/teams.csv を読んで TeamsPool を構築する。ファイルが存在しない場合は空を返す。 */
export function loadTeamsPoolFromCsv(): TeamsPool {
  if (!fs.existsSync(CSV_PATH)) {
    return [];
  }
  try {
    return parseTeamsPoolFromCsvText(fs.readFileSync(CSV_PATH, 'utf-8'));
  } catch (e) {
    console.error(`[loadTeams] Failed to read ${CSV_PATH}:`, e);
    return [];
  }
}
