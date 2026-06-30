import '@/browser/global.css';
import './champions.css';
import { createRoot } from 'react-dom/client';
import { FitText } from '@/browser/components/FitText';
import { useTeamData } from '../_shared/useTeamData';
import type { Side } from '@/nodecg/messages';

function TeamNames() {
  const alpha = useTeamData('alpha');
  const bravo = useTeamData('bravo');

  return (
    <div className="champ-team-names">
      <div className="champ-team-name-wrapper team-alpha">
        <FitText
          html={alpha.team?.viewname ?? ''}
          align="left"
          className="champ-team-name"
        />
      </div>
      <div className="champ-team-name-wrapper team-bravo">
        <FitText
          html={bravo.team?.viewname ?? ''}
          align="left"
          className="champ-team-name"
        />
      </div>
    </div>
  );
}

function PlayersColumn({ side }: { side: Side }) {
  const { team } = useTeamData(side);
  const className = side === 'alpha' ? 'champ-alpha-players' : 'champ-bravo-players';

  return (
    <div className={className}>
      {team?.players.map((p, i) => (
        <div key={i} className="champ-player">{p}</div>
      ))}
    </div>
  );
}

function ChampionsGraphic() {
  return (
    <div className="champ-container">
      <TeamNames />
      <PlayersColumn side="alpha" />
      <PlayersColumn side="bravo" />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<ChampionsGraphic />);
