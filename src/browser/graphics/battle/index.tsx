import '@/browser/global.css';
import './battle.css';
import { createRoot } from 'react-dom/client';
import { FitText } from '@/browser/components/FitText';
import { useReplicant } from '@/browser/hooks/useReplicant';
import { useTeamData } from '../_shared/useTeamData';
import type { Side } from '@/nodecg/messages';

function TeamNames() {
  const alpha = useTeamData('alpha');
  const bravo = useTeamData('bravo');
  const [winCount] = useReplicant('winCount');

  return (
    <div className="battle-team-names">
      <div className="battle-team-name-wrapper team-alpha">
        <FitText
          html={alpha.team?.viewname ?? ''}
          align="left"
          className="battle-team-name"
        />
        <span className="battle-win-count">{winCount?.alpha ?? 0}</span>
      </div>
      <div className="battle-team-name-wrapper team-bravo">
        <FitText
          html={bravo.team?.viewname ?? ''}
          align="left"
          className="battle-team-name"
        />
        <span className="battle-win-count">{winCount?.bravo ?? 0}</span>
      </div>
    </div>
  );
}

function MatchStageLabel() {
  const [matchStage] = useReplicant('matchStage');
  const stage = matchStage?.stage ?? 'preliminary';
  const round = matchStage?.round ?? 1;

  const text =
    stage === 'semifinal' ? '準決勝' : stage === 'final' ? '決勝' : `予選 第${round}回戦`;

  return <div className="battle-match-stage">{text}</div>;
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
      <MatchStageLabel />
      <TeamNames />
      <PlayersColumn side="alpha" />
      <PlayersColumn side="bravo" />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<BattleGraphic />);
