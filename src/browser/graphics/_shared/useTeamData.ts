import { useReplicant } from '../../hooks/useReplicant';
import type { Side } from '@/nodecg/messages';
import type { Team } from '@/schemas';

/** 指定サイドのチームデータを返す。 */
export function useTeamData(side: Side): { team: Team | null } {
  const [teamsPool] = useReplicant('teamsPool');
  const [selection] = useReplicant('selection');

  const teamId = selection?.[side] ?? null;
  const team = teamId
    ? teamsPool?.find((t) => t.id === teamId) ?? null
    : null;

  return { team };
}
