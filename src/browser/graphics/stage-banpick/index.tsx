import '@/browser/global.css';
import './stage-banpick.css';
import { createRoot } from 'react-dom/client';
import { useReplicant } from '@/browser/hooks/useReplicant';
import { stageIconUrl } from '../_shared/stageIconUrl';
import type { StageBanpick } from '@/schemas';

type StageStatus = 'normal' | 'ban' | 'pick' | 'used' | 'inactive';

/**
 * 現在の banpick 状態と「カウンターか否か」から、そのステージの表示状態を決める。
 * 優先度: pick > ban > used > (1試合目のカウンターは inactive) > normal
 */
function stageStatus(name: string, bp: StageBanpick, isCounter: boolean): StageStatus {
  if (bp.picked === name) return 'pick';
  if (bp.banned.includes(name)) return 'ban';
  if (bp.history.includes(name)) return 'used';
  // 1試合目（history 空）はスターターのみが対象。カウンターはプール外なのでディム表示。
  if (isCounter && bp.history.length === 0) return 'inactive';
  return 'normal';
}

function StageCell({ name, status }: { name: string; status: StageStatus }) {
  return (
    <div className={`stage-cell stage-cell--${status}`}>
      <img
        className="stage-cell__icon"
        src={stageIconUrl(name)}
        alt={name}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.visibility = 'hidden';
        }}
      />
      {status === 'ban' && <span className="stage-cell__ban-mark">✕</span>}
    </div>
  );
}

function StageBanpickGraphic() {
  const [stagePool] = useReplicant('stagePool');
  const [stageBanpick] = useReplicant('stageBanpick');

  const pool = stagePool ?? { starter: [], counter: [] };
  const bp: StageBanpick = stageBanpick ?? { history: [], banned: [], picked: null, phase: 'pick' };

  return (
    <div className="banpick-container">
      <div className="banpick-rows">
        <div className="banpick-row banpick-row--starter">
          {pool.starter.map((name) => (
            <StageCell key={name} name={name} status={stageStatus(name, bp, false)} />
          ))}
        </div>
        <div className="banpick-row banpick-row--counter">
          {pool.counter.map((name) => (
            <StageCell key={name} name={name} status={stageStatus(name, bp, true)} />
          ))}
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<StageBanpickGraphic />);
