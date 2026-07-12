import type { TeamsPool, Selection, WinCount, CastCandidates, CastMembers } from '../schemas';

/**
 * すべてのReplicantの型を定義するマップ
 */
export type ReplicantMap = {
  teamsPool: TeamsPool;
  selection: Selection;
  winCount: WinCount;
  castCandidates: CastCandidates;
  castMembers: CastMembers;
};
