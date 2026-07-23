import { z } from 'zod';

/**
 * 予選の規定回戦数。設定 Workspace のパネルが書く。
 * BATTLE パネルの「リセットして次のマッチへ」が matchStage 前進の判定に使う
 * （予選 round がこの値に達したら準決勝へ）。
 */
export const regulationRoundsSchema = z.number().int().min(1).default(3);

export type RegulationRounds = z.infer<typeof regulationRoundsSchema>;
