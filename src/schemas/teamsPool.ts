import { z } from 'zod';
import { teamSchema } from './team';

/**
 * チーム一覧。
 * 起動時に data/teams.csv からロードされ、Dashboard 編集時に上書きされる。
 * NodeCG Replicant の自動永続化（db/ 配下の JSON）に編集結果が保持されるため、
 * CSV 再読み込み時のみ原本から再ロードして編集内容を破棄する。
 */
export const teamsPoolSchema = z.array(teamSchema).default([]);

export type TeamsPool = z.infer<typeof teamsPoolSchema>;
