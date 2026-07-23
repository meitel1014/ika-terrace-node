import { z } from 'zod';

/**
 * 現ルールのステージプール。
 * data/stages/<rule>/stages.json（{ starter, counter }）を
 * Extension が読み込んで導出・書き込む派生状態。
 * Graphic と BATTLE パネルが読む。
 * - starter: スターターステージ（1試合目のおまかせ対象）
 * - counter: カウンターステージ（2試合目以降で追加されるプール）
 */
export const stagePoolSchema = z
  .object({
    starter: z.array(z.string()).default([]),
    counter: z.array(z.string()).default([]),
  })
  .default({ starter: [], counter: [] });

export type StagePool = z.infer<typeof stagePoolSchema>;
