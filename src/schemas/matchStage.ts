import { z } from 'zod';

/**
 * battle グラフィックに表示する試合段階。
 * - stage: 予選 / 準決勝 / 決勝
 * - round: 予選の試合番号（1 始まり）。準決勝・決勝では無視される。
 * Dashboard の「試合段階」パネル（battle-match-stage）が書き、
 * battle グラフィックが読む。
 */
export const matchStageSchema = z.object({
  stage: z.enum(['preliminary', 'semifinal', 'final']).default('preliminary'),
  round: z.number().int().min(1).default(1),
});

export type MatchStage = z.infer<typeof matchStageSchema>;
