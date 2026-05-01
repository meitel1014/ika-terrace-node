import { z } from 'zod';

/**
 * 1 チームの情報。
 * `id`       : CSV 読み込み時に割り振る連番文字列 ("1", "2", "3", ...)。
 *              Replicant 内の検索キー。変更不可。
 * `name`     : CSV 原本のチーム名。records.csv 出力・Dashboard 表示に使う。編集禁止。
 * `viewname` : 表示用チーム名。`<br>` 等の生 HTML を含む場合がある。
 *              Dashboard から自由に編集でき、Graphic でのみ参照する。
 */
export const teamSchema = z.object({
  id: z.string(),
  name: z.string(),
  viewname: z.string(),
  alias: z.string(),
  players: z.tuple([z.string(), z.string(), z.string(), z.string()]),
});

export type Team = z.infer<typeof teamSchema>;
