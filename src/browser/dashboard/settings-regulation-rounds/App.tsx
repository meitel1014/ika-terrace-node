import { useReplicant } from '../../hooks/useReplicant';

export function RegulationRoundsPanel() {
  const [regulationRounds, setRegulationRounds] = useReplicant('regulationRounds');
  const current = regulationRounds ?? 3;

  const setValue = (v: number) => setRegulationRounds(Math.max(1, v));

  return (
    <div className="regulation-rounds-panel">
      <p>予選の規定回戦数を設定します。「リセットして次のマッチへ」で予選がこの回戦数に達すると準決勝へ進みます。</p>

      <div className="field">
        <label>予選 規定回戦数</label>
        <div className="regulation-rounds-stepper">
          <button
            className="btn-sm"
            disabled={current <= 1}
            onClick={() => setValue(current - 1)}
          >
            −
          </button>
          <span className="regulation-rounds-value">{current}回戦</span>
          <button className="btn-sm" onClick={() => setValue(current + 1)}>
            ＋
          </button>
        </div>
      </div>
    </div>
  );
}
