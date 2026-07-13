import { z } from 'zod';

/**
 * 優勝が確定したサイド（null は未確定＝非表示）。
 * winCount / winTarget から Extension が一元的に導出して書き込む唯一の状態。
 * champion グラフィックはこれを読むだけ（ステートレス描画）。
 * 「先に必要勝利数へ達したチームを維持」「必要数を下回ったら解除」も
 * Extension の recomputeChampion() が判断し、ここへ反映する。
 */
export const championSchema = z
  .object({
    side: z.enum(['alpha', 'bravo']).nullable().default(null),
  })
  .default({ side: null });

export type Champion = z.infer<typeof championSchema>;
