import { useReplicant } from '../../hooks/useReplicant';

// 必要勝利数の選択肢。value は先取本数（champion 判定で winCount と比較する値）。
const OPTIONS = [
  { label: 'BO1', value: 1 },
  { label: 'BO3', value: 2 },
  { label: 'BO5', value: 3 },
] as const;

export function WinTargetPanel() {
  const [winTarget, setWinTarget] = useReplicant('winTarget');
  const current = winTarget ?? 2; // 初回未到達時は既定の BO3(2) を選択済み表示

  return (
    <div className="win-target-panel">
      <p>必要勝利数（先取本数）を選択します。</p>
      <div className="win-target-buttons">
        {OPTIONS.map(({ label, value }) => (
          <button
            key={value}
            className={`toggle-btn${current === value ? ' toggle-btn--on' : ''}`}
            onClick={() => setWinTarget(value)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
