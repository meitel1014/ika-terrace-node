import { useTeamData } from './useTeamData';
import { ShadowFilters } from './ShadowFilters';
import type { Side } from '@/nodecg/messages';

const SHADOW = {
  color: 'rgb(43, 43, 43)',
  opacity: 0.7,
  dilate: 4,
  dx: 0,
  dy: 2,
  blur: 2,
} as const;

function TeamSlot({ side }: { side: Side }) {
  const { team } = useTeamData(side);

  return (
    <div className={`under-slot under-${side}`}>
      {team && (
        <>
          <div className="under-team-name">{team.name}</div>
          <div className="under-players">
            {team.players.join('　')}
          </div>
        </>
      )}
    </div>
  );
}

export function UnderGraphic() {
  return (
    <div className="under-container">
      <ShadowFilters shadow={SHADOW} />
      <TeamSlot side="alpha" />
      <TeamSlot side="bravo" />
    </div>
  );
}
