import { z } from 'zod';

/**
 * 現ルールのステージプール。
 * data/stages/<rule>/stages.json を Extension が読み込んで導出・書き込む派生状態。
 * Graphic と BATTLE パネルが読む。
 * - starter: スターターステージ名（1試合目のおまかせ対象）
 * - counter: カウンターステージ名（2試合目以降で追加されるプール）
 * - labels: ステージ名 → 表示用ラベル（`<br>` 等の改行指定を含みうる）。
 *   未登録のステージはステージ名そのものを表示する。アイコン照合キーは常に name を使う。
 */
export const stagePoolSchema = z
  .object({
    starter: z.array(z.string()).default([]),
    counter: z.array(z.string()).default([]),
    labels: z.record(z.string()).default({}),
  })
  .default({ starter: [], counter: [], labels: {} });

export type StagePool = z.infer<typeof stagePoolSchema>;
