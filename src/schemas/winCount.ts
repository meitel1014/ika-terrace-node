import { z } from 'zod';

/**
 * アルファ / ブラボー 各枠の勝利数（本数）。
 * side ベースで保持し、チーム選択を入れ替えると Extension 側で 0 にリセットされる。
 */
export const winCountSchema = z
  .object({
    alpha: z.number().int().min(0).default(0),
    bravo: z.number().int().min(0).default(0),
  })
  .default({ alpha: 0, bravo: 0 });

export type WinCount = z.infer<typeof winCountSchema>;
