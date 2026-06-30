import type { TeamsPool, Selection, CastCandidates, CastMembers } from '../schemas';

/**
 * すべてのReplicantの型を定義するマップ
 */
export type ReplicantMap = {
  teamsPool: TeamsPool;
  selection: Selection;
  castCandidates: CastCandidates;
  castMembers: CastMembers;
};
