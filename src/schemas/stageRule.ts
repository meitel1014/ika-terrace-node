import { z } from 'zod';
import { ruleSchema } from './rule';

/**
 * ステージバンピックで現在採用しているルール。
 * シリーズ全体で 1 つ固定。設定 Workspace のルール選択パネルが書き、
 * Extension（stagePool 導出・ステージ自動判別）と Graphic が読む。
 */
export const stageRuleSchema = ruleSchema.default('splatZones');

export type StageRule = z.infer<typeof stageRuleSchema>;
