import type { Team, CastMembers } from '../schemas';

export type Side = 'alpha' | 'bravo';

/**
 * すべてのメッセージの型を定義するマップ
 */
export type MessageMap = {
  /** data/teams.csv から teamsPool を再読み込み（編集内容は破棄される） */
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- ts-nodecg の規約：データなしメッセージは {} で表現
  reloadTeamsCsv: {};

  /** teamsPool 内の 1 チームを ID キーで部分更新する */
  updateTeam: { data: { teamId: string; patch: Partial<Team> } };

  /** data/cast.json から castCandidates を再読み込み */
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- ts-nodecg の規約：データなしメッセージは {} で表現
  reloadCastJson: {};

  /** 4 役職の担当者名をまとめて適用 */
  setCastMembers: { data: CastMembers };
};
