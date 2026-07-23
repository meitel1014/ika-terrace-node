import { useReplicant } from '../../hooks/useReplicant';
import type { Rule } from '@/schemas';

// ルール選択肢。value は Replicant/ディレクトリ名（data/stages/<value>/）、label は表示名。
const RULE_OPTIONS: { label: string; value: Rule }[] = [
  { label: 'ナワバリ', value: 'turfWar' },
  { label: 'ガチエリア', value: 'splatZones' },
  { label: 'ガチヤグラ', value: 'towerControl' },
  { label: 'ガチホコ', value: 'rainmaker' },
  { label: 'ガチアサリ', value: 'clamBlitz' },
];

export function StageRulePanel() {
  const [stageRule, setStageRule] = useReplicant('stageRule');
  const current = stageRule ?? 'splatZones';

  return (
    <div className="stage-rule-panel">
      <p>ステージバンピックのルールを選択します（プール・自動判別に反映）。</p>
      <div className="stage-rule-buttons">
        {RULE_OPTIONS.map(({ label, value }) => (
          <button
            key={value}
            className={`toggle-btn${current === value ? ' toggle-btn--on' : ''}`}
            onClick={() => setStageRule(value)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
