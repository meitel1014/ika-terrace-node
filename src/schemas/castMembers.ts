import { z } from 'zod';

export const castMembersSchema = z
  .object({
    announcer: z.string().default(''),
    commentator: z.string().default(''),
    operator: z.string().default(''),
    observer: z.string().default(''),
  })
  .default({ announcer: '', commentator: '', operator: '', observer: '' });

export type CastMembers = z.infer<typeof castMembersSchema>;
