import '@/browser/global.css';
import './champion.css';
import { createRoot } from 'react-dom/client';
import { FitText } from '@/browser/components/FitText';
import { useReplicant } from '@/browser/hooks/useReplicant';
import { useTeamData } from '../_shared/useTeamData';
import type { Side } from '@/nodecg/messages';

// champion 確定サイドのチームを表示する内部コンポーネント。
// useTeamData（hook）を条件付きで呼ばないよう、side が確定したときだけこれをレンダーする。
function ChampionTeam({ side }: { side: Side }) {
  const { team } = useTeamData(side);
  if (!team) return null;

  return (
    <div className="champion-content">
      <FitText
        html={team.viewname}
        align="center"
        className="champion-team-name"
      />
      <div className="champion-players">
        {team.players.map((p, i) => (
          <div key={i} className="champion-player">{p.name}</div>
        ))}
      </div>
    </div>
  );
}

function ChampionGraphic() {
  const [champion] = useReplicant('champion');
  const side = champion?.side ?? null;

  return (
    <div className="champion-container">
      {side && <ChampionTeam side={side} />}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<ChampionGraphic />);
