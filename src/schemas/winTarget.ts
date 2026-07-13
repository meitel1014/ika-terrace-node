import { z } from 'zod';

/**
 * 決勝の必要勝利数（先取本数）。
 * 1 = BO1 / 2 = BO3 / 3 = BO5。デフォルトは BO3(2)。
 * Dashboard の「必要勝利数」パネルが書き、Extension（champion 判定）と
 * champion グラフィックが読む。
 */
export const winTargetSchema = z.number().int().min(1).max(3).default(2);

export type WinTarget = z.infer<typeof winTargetSchema>;
