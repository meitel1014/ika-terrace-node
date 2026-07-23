import { z } from 'zod';

/**
 * ステージバンピックで扱うルール（モード）。
 * ディレクトリ名 data/stages/<rule>/ と一致する。
 * - turfWar      ナワバリバトル
 * - splatZones   ガチエリア
 * - towerControl ガチヤグラ
 * - rainmaker    ガチホコバトル
 * - clamBlitz    ガチアサリ
 */
export const ruleSchema = z.enum([
  'turfWar',
  'splatZones',
  'towerControl',
  'rainmaker',
  'clamBlitz',
]);

export type Rule = z.infer<typeof ruleSchema>;
