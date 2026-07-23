import '@/browser/global.css';
import './stage-banpick.css';
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useReplicant } from '@/browser/hooks/useReplicant';
import { Html } from '@/browser/components/Html';
import { stageIconUrl } from '../_shared/stageIconUrl';
import type { StageBanpick, StagePool } from '@/schemas';

type StageStatus = 'normal' | 'ban' | 'pick' | 'used' | 'inactive';

/**
 * 現在の banpick 状態と「カウンターか否か」から、そのステージの表示状態を決める。
 * 優先度: pick > ban > used > (1試合目のカウンターは inactive) > normal
 *
 * BAN は Control 側で確定（ban フェーズを抜けた）後のみ表示する。
 * ban フェーズ中（選択作業中）は Graphic に反映しない。
 */
function stageStatus(name: string, bp: StageBanpick, isCounter: boolean): StageStatus {
  if (bp.picked === name) return 'pick';
  if (bp.phase !== 'ban' && bp.banned.includes(name)) return 'ban';
  if (bp.history.includes(name)) return 'used';
  // 1試合目（history 空）はスターターのみが対象。カウンターはプール外なのでディム表示。
  if (isCounter && bp.history.length === 0) return 'inactive';
  return 'normal';
}

function StageCell({ name, label, status }: { name: string; label: string; status: StageStatus }) {
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
      <span className="stage-cell__grad" />
      {/* label は <br> 等の改行指定を含みうるため Html 経由で描画 */}
      <Html as="span" className="stage-cell__name" value={label} />
      {status === 'ban' && <span className="stage-cell__ban-mark">✕</span>}
    </div>
  );
}

function StageBanpickGraphic() {
  const [stagePool] = useReplicant('stagePool');
  const [stageBanpick] = useReplicant('stageBanpick');

  const pool = stagePool ?? { starter: [], counter: [], labels: {} };
  const bp: StageBanpick = stageBanpick ?? { history: [], banned: [], picked: null, phase: 'pick' };

  // 1試合目（history 空）はスターターからのおまかせなので、バンピックの様子は表示しない。
  // 表示/非表示は opacity の切り替えで行い、出現時・消滅（リセット）時に
  // フェードイン/アウトさせる（アンマウントすると退場アニメが効かないため常時マウント）。
  const visible = bp.history.length > 0;

  // 消滅時に「最後の可視状態のまま」薄れさせるため、可視中はスナップショットを更新し、
  // 非可視になったら直前のスナップショットを表示し続ける（リセットで素の状態に戻る前の見た目を保持）。
  const [snapshot, setSnapshot] = useState<{ pool: StagePool; bp: StageBanpick }>({ pool, bp });
  useEffect(() => {
    if (visible) setSnapshot({ pool, bp });
  }, [visible, pool, bp]);

  const display = visible ? { pool, bp } : snapshot;

  return (
    <div className="banpick-container">
      <div className={`banpick-rows${visible ? ' banpick-rows--visible' : ''}`}>
        <div className="banpick-row banpick-row--starter">
          {display.pool.starter.map((name) => (
            <StageCell
              key={name}
              name={name}
              label={display.pool.labels[name] ?? name}
              status={stageStatus(name, display.bp, false)}
            />
          ))}
        </div>
        <div className="banpick-row banpick-row--counter">
          {display.pool.counter.map((name) => (
            <StageCell
              key={name}
              name={name}
              label={display.pool.labels[name] ?? name}
              status={stageStatus(name, display.bp, true)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<StageBanpickGraphic />);
