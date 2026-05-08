import type {
  ActiveMode,
  TeamsPool,
  Selection,
  Visibility,
  Matches,
  MatchCandidates,
  WeaponAliases,
  GoogleSheetSync,
  GasEndpointConfigured,
  StageNames,
  InGameNames,
  CastCandidates,
  CastMembers,
} from '../schemas';

/**
 * すべてのReplicantの型を定義するマップ
 */
export type ReplicantMap = {
  activeMode: ActiveMode;
  teamsPool: TeamsPool;
  selection: Selection;
  visibility: Visibility;
  matches: Matches;
  matchCandidates: MatchCandidates;
  weaponAliases: WeaponAliases;
  googleSheetSync: GoogleSheetSync;
  gasEndpointConfigured: GasEndpointConfigured;
  stageNames: StageNames;
  inGameNames: InGameNames;
  castCandidates: CastCandidates;
  castMembers: CastMembers;
};
