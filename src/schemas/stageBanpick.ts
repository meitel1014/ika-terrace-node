import { z } from 'zod';

/**
 * ステージバンピックの進行状態。BATTLE パネルが直接書き、Graphic が読む。
 * winCount とは疎結合で、「使用済みステージ」は history で独立管理する。
 *
 * - history: 過去の試合（ゲーム）で確定したステージ名。プールから除外・グレー表示。
 *   history.length + 1 が「現在の試合番号」を表す。
 * - banned: 現在の試合で BAN 中のステージ名（2試合目以降、最大 2）。
 * - picked: 現在の試合で PICK 確定したステージ名（null は未確定）。
 * - phase: 現在の操作段階。
 *   - 'ban'       … BAN 選択中（2試合目以降）
 *   - 'pick'      … PICK 選択中（1試合目はここから開始・BAN なし）
 *   - 'confirmed' … 当該試合のステージ確定・表示中
 */
export const stageBanpickSchema = z
  .object({
    history: z.array(z.string()).default([]),
    banned: z.array(z.string()).default([]),
    picked: z.string().nullable().default(null),
    phase: z.enum(['ban', 'pick', 'confirmed']).default('pick'),
  })
  .default({ history: [], banned: [], picked: null, phase: 'pick' });

export type StageBanpick = z.infer<typeof stageBanpickSchema>;
