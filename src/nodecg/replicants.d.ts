import type { TeamsPool, Selection, WinCount, WinTarget, Champion, CastCandidates, CastMembers } from '../schemas';

/**
 * すべてのReplicantの型を定義するマップ
 */
export type ReplicantMap = {
  teamsPool: TeamsPool;
  selection: Selection;
  winCount: WinCount;
  winTarget: WinTarget;
  champion: Champion;
  castCandidates: CastCandidates;
  castMembers: CastMembers;
};
