import { z } from 'zod';

/**
 * 1 プレイヤーの情報。
 * `xId`      : X(Twitter) ID の生値（先頭 `@` の有無は問わない）。表示側で正規化する。
 * `weapons`  : 持ちブキ（`data/weapon_aliases.csv` の `id` 列、画像ファイル名）の配列。
 *              表示は先頭から最大 3 件。
 */
export const playerSchema = z.object({
  name: z.string(),
  xId: z.string(),
  weapons: z.array(z.string()),
});

/**
 * 1 チームの情報。
 * `id`       : CSV/シート読み込み時に割り振る連番文字列 ("1", "2", "3", ...)。
 *              Replicant 内の検索キー。変更不可。
 * `name`     : チーム名原本。records.csv 出力・Dashboard 表示に使う。編集禁止。
 * `viewname` : 表示用チーム名。`<br>` 等の生 HTML を含む場合がある。
 *              Dashboard から自由に編集でき、Graphic でのみ参照する。
 */
export const teamSchema = z.object({
  id: z.string(),
  name: z.string(),
  viewname: z.string(),
  players: z.tuple([playerSchema, playerSchema, playerSchema, playerSchema]),
});

export type Player = z.infer<typeof playerSchema>;
export type Team = z.infer<typeof teamSchema>;
