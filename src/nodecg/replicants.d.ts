import type { TeamsPool, Selection, WinCount, WinTarget, MatchStage, Champion, CastCandidates, CastMembers, StageRule, StagePool, StageBanpick, DetectedStage, RegulationRounds } from '../schemas';

/**
 * すべてのReplicantの型を定義するマップ
 */
export type ReplicantMap = {
  teamsPool: TeamsPool;
  selection: Selection;
  winCount: WinCount;
  winTarget: WinTarget;
  matchStage: MatchStage;
  champion: Champion;
  castCandidates: CastCandidates;
  castMembers: CastMembers;
  stageRule: StageRule;
  stagePool: StagePool;
  stageBanpick: StageBanpick;
  detectedStage: DetectedStage;
  regulationRounds: RegulationRounds;
};
