import { FitText } from '../../components/FitText';
import { useTeamData } from './useTeamData';
import { weaponImageUrl } from './weaponImageUrl';
import type { Side } from '@/nodecg/messages';
import type { Player } from '@/schemas';

/** X(Twitter) ID の生値に `@` を付与して表示用文字列にする。空なら空文字。 */
function formatXId(xId: string): string {
  const trimmed = xId.trim();
  if (!trimmed) return '';
  return trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
}

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
          <FitText html={team.viewname} align="left" className="roster-team-name" />
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
