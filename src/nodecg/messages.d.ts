import type { Team, Player, CastMembers } from '../schemas';

export type Side = 'alpha' | 'bravo';

/**
 * すべてのメッセージの型を定義するマップ
 */
export type MessageMap = {
  /** data/teams.csv から teamsPool を再読み込み（編集内容は破棄される） */
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- ts-nodecg の規約：データなしメッセージは {} で表現
  reloadTeamsCsv: {};

  /**
   * Google スプレッドシート（申請フォーム + 選手情報登録フォーム）から teamsPool を再読み込み。
   * 読み込みに失敗した場合 teamsPool は変更されない。
   */
  reloadTeamsFromSheets: { error: string };

  /** teamsPool 内の 1 チームを ID キーで部分更新する */
  updateTeam: {
    data: {
      teamId: string;
      patch: Partial<Omit<Team, 'players'>> & { players?: Partial<Player>[] };
    };
  };

  /** data/cast.json から castCandidates を再読み込み */
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- ts-nodecg の規約：データなしメッセージは {} で表現
  reloadCastJson: {};

  /** 4 役職の担当者名をまとめて適用 */
  setCastMembers: { data: CastMembers };
};
