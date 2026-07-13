import { FitText } from '../../components/FitText';
import { formatXId } from '../../utils/formatXId';
import { useTeamData } from './useTeamData';
import { weaponImageUrl } from './weaponImageUrl';
import type { Side } from '@/nodecg/messages';
import type { Player } from '@/schemas';

function PlayerRow({ player }: { player: Player }) {
  return (
    <div className="roster-player">
      <div className="roster-player-name">{player.name}</div>
      <div className="roster-player-weapons">
        {player.weapons.slice(0, 3).map((id) => (
          <img key={id} src={weaponImageUrl(id)} className="roster-weapon-icon" alt="" />
        ))}
      </div>
      <div className="roster-player-xid">{formatXId(player.xId)}</div>
    </div>
  );
}

export function TeamRosterGraphic({ side }: { side: Side }) {
  const { team } = useTeamData(side);

  return (
    <div className={`roster-container roster-${side}`}>
      {team && (
        <>
          <div className="roster-team-name-box">
            <FitText html={team.viewname} align="center" className="roster-team-name" />
          </div>
          <div className="roster-players">
            {team.players.map((p, i) => (
              <PlayerRow key={i} player={p} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
