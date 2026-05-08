import { z } from 'zod';

export const castCandidatesSchema = z
  .object({
    cast: z.array(z.string()).default([]),
    operator: z.array(z.string()).default([]),
    observer: z.array(z.string()).default([]),
  })
  .default({ cast: [], operator: [], observer: [] });

export type CastCandidates = z.infer<typeof castCandidatesSchema>;
