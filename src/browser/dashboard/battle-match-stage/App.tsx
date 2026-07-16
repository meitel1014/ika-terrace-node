import { useReplicant } from '../../hooks/useReplicant';
import type { MatchStage } from '@/schemas';

// 試合段階の選択肢。value は Replicant に保存する内部値、label は表示名。
const STAGE_OPTIONS = [
  { label: '予選', value: 'preliminary' },
  { label: '準決勝', value: 'semifinal' },
  { label: '決勝', value: 'final' },
] as const;

const DEFAULT: MatchStage = { stage: 'preliminary', round: 1 };

export function MatchStagePanel() {
  const [matchStage, setMatchStage] = useReplicant('matchStage');
  const current = matchStage ?? DEFAULT; // 初回未到達時は既定値を表示

  const isPreliminary = current.stage === 'preliminary';

  const setStage = (stage: MatchStage['stage']) => {
    setMatchStage({ ...current, stage });
  };

  // 試合番号は 1 始まり。予選選択時のみ操作可能。
  const setRound = (round: number) => {
    setMatchStage({ ...current, round: Math.max(1, round) });
  };

  return (
    <div className="match-stage-panel">
      <p>battle グラフィックに表示する試合段階を設定します。</p>

      <div className="field">
        <label htmlFor="match-stage-select">段階</label>
        <select
          id="match-stage-select"
          value={current.stage}
          onChange={(e) => setStage(e.target.value as MatchStage['stage'])}
        >
          {STAGE_OPTIONS.map(({ label, value }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label>試合番号（予選のみ）</label>
        <div className="match-stage-round">
          <button
            className="btn-sm"
            disabled={!isPreliminary || current.round <= 1}
            onClick={() => setRound(current.round - 1)}
          >
            −
          </button>
          <span className={`match-stage-round-value${isPreliminary ? '' : ' match-stage-round-value--disabled'}`}>
            第{current.round}回戦
          </span>
          <button
            className="btn-sm"
            disabled={!isPreliminary}
            onClick={() => setRound(current.round + 1)}
          >
            ＋
          </button>
        </div>
      </div>
    </div>
  );
}
