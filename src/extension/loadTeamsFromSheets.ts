import { findCredentialsFile, createGoogleAuth, getSpreadsheet, resolveWorksheet } from './googleSheetsClient';
import { loadSheetsConfig } from './sheetsConfig';
import { loadWeaponAliasMap, splitWeaponNames, resolveWeaponIds } from './weaponAliases';
import type { TeamsPool, Team, Player } from '../schemas';

type Log = {
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
};

/**
 * 半角数字 / 全角数字 / 丸数字のいずれかを列名に含む列を検出するための数字バリエーション。
 * loadTeams.ts の PLAYER_DIGITS と同じ方針（申請フォームの表記揺れに対応）。
 */
const PLAYER_DIGITS = [
  ['1', '１', '①'],
  ['2', '２', '②'],
  ['3', '３', '③'],
  ['4', '４', '④'],
] as const;

function normalizeXId(raw: string): string {
  return raw.trim().replace(/^@/, '').toLowerCase();
}

function findPlayerColumn(
  headerValues: string[],
  playerNum: 0 | 1 | 2 | 3,
  kind: 'name' | 'xid',
): string | undefined {
  const digits = PLAYER_DIGITS[playerNum];
  return headerValues.find((h) => {
    if (!digits.some((d) => h.includes(d))) return false;
    return kind === 'name' ? h.includes('名前') : h.includes('X') && h.includes('ID');
  });
}

/**
 * 申請フォーム + 選手情報登録フォームのスプレッドシートから TeamsPool を構築する。
 * 認証・読み込みのいずれかに失敗した場合は null を返す（呼び出し側で CSV にフォールバックする想定）。
 */
export async function loadTeamsFromSheets(log: Log): Promise<TeamsPool | null> {
  try {
    const config = loadSheetsConfig(log);
    if (!config) return null;

    const keyFilePath = findCredentialsFile(log);
    if (!keyFilePath) return null;

    const auth = createGoogleAuth(keyFilePath);

    const [appDoc, regDoc] = await Promise.all([
      getSpreadsheet(config.applicationForm.spreadsheetId, auth),
      getSpreadsheet(config.playerRegistrationForm.spreadsheetId, auth),
    ]);

    const appSheet = resolveWorksheet(appDoc, config.applicationForm);
    const regSheet = resolveWorksheet(regDoc, config.playerRegistrationForm);
    if (!appSheet || !regSheet) {
      log.warn('[loadTeamsFromSheets] ワークシートが見つかりません');
      return null;
    }

    const aliasMap = loadWeaponAliasMap();

    // ── 選手情報登録フォーム: 名前+X ID → 持ちブキ生文字列 のルックアップを構築 ──
    const regRows = await regSheet.getRows();
    const regHeader = regSheet.headerValues;
    const nameCol = regHeader.find((h) => h.includes('名前') || h.includes('プレイヤー名'));
    const xIdCol = regHeader.find((h) => h.includes('X') && h.includes('ID'));
    const weaponsCol = regHeader.find((h) => h.includes('持ちブキ'));

    const registrationMap = new Map<string, string>();
    if (nameCol && xIdCol && weaponsCol) {
      for (const row of regRows) {
        const name = String(row.get(nameCol) ?? '').trim();
        const xid = normalizeXId(String(row.get(xIdCol) ?? ''));
        if (!name || !xid) continue;
        registrationMap.set(`${name}|${xid}`, String(row.get(weaponsCol) ?? ''));
      }
    } else {
      log.warn('[loadTeamsFromSheets] 選手情報登録フォームの列構成（名前/X ID/持ちブキ）を認識できません');
    }

    // ── 申請フォーム: チーム + プレイヤー1〜4 を構築 ──
    const appRows = await appSheet.getRows();
    const appHeader = appSheet.headerValues;
    const teamNameCol = appHeader.find((h) => h.includes('チーム名'));
    if (!teamNameCol) {
      log.warn('[loadTeamsFromSheets] 申請フォームに「チーム名」列が見つかりません');
      return null;
    }

    const playerCols = ([0, 1, 2, 3] as const).map((i) => ({
      name: findPlayerColumn(appHeader, i, 'name'),
      xid: findPlayerColumn(appHeader, i, 'xid'),
    }));

    const pool: TeamsPool = [];
    let serial = 0;

    for (const row of appRows) {
      const teamName = String(row.get(teamNameCol) ?? '').trim();
      if (!teamName) continue;
      serial++;

      const players = playerCols.map(({ name: nameColumn, xid: xIdColumn }): Player => {
        const playerName = nameColumn ? String(row.get(nameColumn) ?? '').trim() : '';
        const xIdRaw = xIdColumn ? String(row.get(xIdColumn) ?? '').trim() : '';

        let weapons: string[] = [];
        if (playerName && xIdRaw) {
          const weaponsRaw = registrationMap.get(`${playerName}|${normalizeXId(xIdRaw)}`);
          if (weaponsRaw) {
            weapons = resolveWeaponIds(splitWeaponNames(weaponsRaw), aliasMap, log);
          }
        }

        return { name: playerName, xId: xIdRaw, weapons };
      }) as [Player, Player, Player, Player];

      const team: Team = {
        id: String(serial),
        name: teamName,
        viewname: teamName,
        players,
      };
      pool.push(team);
    }

    return pool;
  } catch (e) {
    log.error('[loadTeamsFromSheets] スプレッドシート読み込みに失敗しました:', e);
    return null;
  }
}
