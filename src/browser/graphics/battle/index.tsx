import '@/browser/global.css';
import './battle.css';
import { createRoot } from 'react-dom/client';
import { FitText } from '@/browser/components/FitText';
import { useTeamData } from '../_shared/useTeamData';
import type { Side } from '@/nodecg/messages';

function TeamNames() {
  const alpha = useTeamData('alpha');
  const bravo = useTeamData('bravo');

  return (
    <div className="battle-team-names">
      <div className="battle-team-name-wrapper team-alpha">
        <FitText
          html={alpha.team?.viewname ?? ''}
          align="left"
          className="battle-team-name"
        />
      </div>
      <div className="battle-team-name-wrapper team-bravo">
        <FitText
          html={bravo.team?.viewname ?? ''}
          align="left"
          className="battle-team-name"
        />
      </div>
    </div>
  );
}

function PlayersColumn({ side }: { side: Side }) {
  const { team } = useTeamData(side);
  const className = side === 'alpha' ? 'battle-alpha-players' : 'battle-bravo-players';

  return (
    <div className={className}>
      {team?.players.map((p, i) => (
        <div key={i} className="battle-player">{p.name}</div>
      ))}
    </div>
  );
}

function BattleGraphic() {
  return (
    <div className="battle-container">
      <TeamNames />
      <PlayersColumn side="alpha" />
      <PlayersColumn side="bravo" />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<BattleGraphic />);
