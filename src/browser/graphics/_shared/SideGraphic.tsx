import { FitText } from '../../components/FitText';
import { useTeamData } from './useTeamData';
import { ShadowFilters } from './ShadowFilters';
import type { Side } from '@/nodecg/messages';

const SHADOW = {
  color: 'rgb(94, 94, 94)',
  opacity: 0.6,
  dilate: 6,
  dx: 6,
  dy: 10,
  blur: 4,
} as const;

function TeamSlot({ side }: { side: Side }) {
  const { team } = useTeamData(side);
  const align = side === 'alpha' ? 'left' : 'right';

  return (
    <div className={`side-slot side-${side}`}>
      {team && (
        <div className="side-team-content">
          <FitText
            html={team.viewname}
            align={align}
            className="side-team-name"
          />
          <div className="side-players">
            {team.players.map((p, i) => (
              <div key={i} className="side-player">{p}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function SideGraphic() {
  return (
    <div className="side-container">
      <ShadowFilters shadow={SHADOW} />
      <TeamSlot side="alpha" />
      <TeamSlot side="bravo" />
    </div>
  );
}
