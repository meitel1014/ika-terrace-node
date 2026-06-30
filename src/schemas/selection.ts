import { z } from 'zod';

/**
 * アルファ / ブラボー に選択されたチーム ID（null は未選択）。
 * ID は TeamsPool 内で一意のキーとして扱う。
 */
export const selectionSchema = z
  .object({
    alpha: z.string().nullable().default(null),
    bravo: z.string().nullable().default(null),
  })
  .default({ alpha: null, bravo: null });

export type Selection = z.infer<typeof selectionSchema>;
