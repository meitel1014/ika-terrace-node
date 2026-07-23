import { z } from 'zod';

/**
 * ステージ自動判別（POST /stage）の最新結果。Extension が書き、
 * BATTLE パネル（1試合目）が候補として読む。
 * - stageName: 最良候補のステージ名（null は未判別）
 * - score: ZNCC スコア（0–1）
 */
export const detectedStageSchema = z
  .object({
    stageName: z.string().nullable().default(null),
    score: z.number().default(0),
  })
  .default({ stageName: null, score: 0 });

export type DetectedStage = z.infer<typeof detectedStageSchema>;
