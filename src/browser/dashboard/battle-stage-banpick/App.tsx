import { useReplicant } from '../../hooks/useReplicant';
import { stripHtml } from '@/browser/utils/stripHtml';
import type { StageBanpick, MatchStage } from '@/schemas';

const DEFAULT_BP: StageBanpick = { history: [], banned: [], picked: null, phase: 'pick' };
const DEFAULT_MS: MatchStage = { stage: 'preliminary', round: 1 };
const MAX_BAN = 2;

// パネル用の小さめステージアイコン（data/stages/icon）を配信する /stage-thumbs のURL。
// nodecg.mount() はバンドル名プレフィックスされないため素のパスを返す。
function stageThumbUrl(name: string): string {
  return `/stage-thumbs/${encodeURIComponent(stripHtml(name))}`;
}

// ステージアイコン + 左下に小さめの名前 + 下部の黒グラデーションを描くタイル。
function StageTile({ name }: { name: string }) {
  return (
    <>
      <img
        className="stage-btn__icon"
        src={stageThumbUrl(name)}
        alt={name}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.visibility = 'hidden';
        }}
      />
      <span className="stage-btn__grad" />
      <span className="stage-btn__name">{name}</span>
    </>
  );
}

// 次のマッチへ進む際の matchStage 前進ロジック。
// 予選が規定回戦に達したら準決勝、準決勝なら決勝、決勝は据え置き。
function advanceMatchStage(ms: MatchStage, regulationRounds: number): MatchStage {
  if (ms.stage === 'preliminary') {
    return ms.round < regulationRounds
      ? { stage: 'preliminary', round: ms.round + 1 }
      : { stage: 'semifinal', round: 1 };
  }
  if (ms.stage === 'semifinal') return { stage: 'final', round: 1 };
  return ms; // final は据え置き
}

export function StageBanpickPanel() {
  const [stagePool] = useReplicant('stagePool');
  const [stageBanpick, setStageBanpick] = useReplicant('stageBanpick');
  const [detectedStage] = useReplicant('detectedStage');
  const [matchStage, setMatchStage] = useReplicant('matchStage');
  const [regulationRounds] = useReplicant('regulationRounds');
  const [winTarget] = useReplicant('winTarget');
  const [, setSelection] = useReplicant('selection');

  const pool = stagePool ?? { starter: [], counter: [] };
  const bp = stageBanpick ?? DEFAULT_BP;

  const currentGame = bp.history.length + 1;
  const isGame1 = bp.history.length === 0;

  // BO の最大試合数（先取本数 winTarget から算出）。BO1→1 / BO3→3 / BO5→5。
  // この試合数より先（次の試合）へは進めない。
  const maxGames = (winTarget ?? 2) * 2 - 1;
  const isLastGame = currentGame >= maxGames;

  // 選択グリッドに並べるステージ。スターター＋カウンターの全プール（重複除去）。
  // 1試合目は本来スターターからのおまかせだが、念のためカウンターも手動選択できるよう
  // 全ステージを選べるようにする。使用済みは各ボタン側で無効化する。
  const fullPool = [...new Set([...pool.starter, ...pool.counter])];
  const counterSet = new Set(pool.counter);
  const usedSet = new Set(bp.history);

  // ── 操作ハンドラ ──────────────────────────────

  const toggleBan = (name: string) => {
    if (usedSet.has(name)) return;
    const banned = bp.banned.includes(name)
      ? bp.banned.filter((s) => s !== name)
      : bp.banned.length < MAX_BAN
        ? [...bp.banned, name]
        : bp.banned;
    setStageBanpick({ ...bp, banned });
  };

  const selectPick = (name: string) => {
    if (usedSet.has(name) || bp.banned.includes(name)) return;
    // 選択済みのステージを再クリックしたら選択解除する。
    setStageBanpick({ ...bp, picked: bp.picked === name ? null : name });
  };

  const confirmBan = () => setStageBanpick({ ...bp, phase: 'pick' });

  const confirmPick = () => {
    if (!bp.picked) return;
    // 1試合目はおまかせで確定段階が不要なため、確定と同時に次の試合の BAN へ直行する。
    // （BO1 など次の試合が無い場合は従来どおり確定表示にする）
    if (isGame1 && !isLastGame) {
      setStageBanpick({ history: [...bp.history, bp.picked], banned: [], picked: null, phase: 'ban' });
    } else {
      setStageBanpick({ ...bp, phase: 'confirmed' });
    }
  };

  // 次の試合へ: 確定したステージを history に積み、BAN フェーズで次試合を開始。
  // BO の最大試合数（winTarget）に達している場合は進めない。
  const nextGame = () => {
    if (!bp.picked || isLastGame) return;
    setStageBanpick({
      history: [...bp.history, bp.picked],
      banned: [],
      picked: null,
      phase: 'ban',
    });
  };

  const applyDetected = () => {
    const name = detectedStage?.stageName;
    if (name) setStageBanpick({ ...bp, picked: name });
  };

  // 一つ前の段階へ戻る。
  const canGoBack =
    bp.phase === 'confirmed' ||
    (bp.phase === 'pick' && !isGame1) ||
    (bp.phase === 'ban' && bp.history.length > 0);

  const goBack = () => {
    if (bp.phase === 'confirmed') {
      setStageBanpick({ ...bp, phase: 'pick' });
    } else if (bp.phase === 'pick' && !isGame1) {
      setStageBanpick({ ...bp, phase: 'ban', picked: null });
    } else if (bp.phase === 'ban' && bp.history.length > 0) {
      // 直前の試合へ巻き戻す。1試合目には確定段階が無いので pick に戻し、
      // それ以外は確定表示（confirmed）に戻す。
      const prev = bp.history[bp.history.length - 1];
      const newHistory = bp.history.slice(0, -1);
      setStageBanpick({
        history: newHistory,
        banned: [],
        picked: prev,
        phase: newHistory.length === 0 ? 'pick' : 'confirmed',
      });
    }
  };

  const reset = () => setStageBanpick(DEFAULT_BP);

  const resetAndNextMatch = () => {
    setStageBanpick(DEFAULT_BP);
    setSelection({ alpha: null, bravo: null });
    setMatchStage(advanceMatchStage(matchStage ?? DEFAULT_MS, regulationRounds ?? 3));
  };

  // ── ステージボタンの状態算出 ──────────────────

  const stageButtonClass = (name: string): string => {
    const classes = ['stage-btn'];
    if (usedSet.has(name)) classes.push('stage-btn--used');
    if (bp.banned.includes(name)) classes.push('stage-btn--ban');
    if (bp.picked === name) classes.push('stage-btn--pick');
    // 1試合目のカウンターは通常プール外（手動選択のみ）なので控えめに表示。
    if (isGame1 && counterSet.has(name)) classes.push('stage-btn--offpool');
    return classes.join(' ');
  };

  const onStageClick = (name: string) => {
    if (bp.phase === 'ban') toggleBan(name);
    else if (bp.phase === 'pick') selectPick(name);
  };

  const phaseLabel =
    bp.phase === 'ban'
      ? `BAN（${bp.banned.length}/${MAX_BAN}）`
      : bp.phase === 'pick'
        ? 'PICK（1つ選択）'
        : '確定';

  return (
    <div className="banpick-panel">
      <div className="banpick-head">
        <span className="banpick-game">第{currentGame}試合 / 最大{maxGames}試合</span>
        <span className="banpick-phase">{isGame1 ? '手動選択（スターター推奨）' : phaseLabel}</span>
      </div>

      {/* 1試合目の自動判別候補 */}
      {isGame1 && bp.phase !== 'confirmed' && (
        <div className="banpick-detect">
          <span>
            自動判別:{' '}
            {detectedStage?.stageName
              ? `${detectedStage.stageName}（${(detectedStage.score * 100).toFixed(1)}%）`
              : '未判別'}
          </span>
          <button
            className="btn-sm"
            disabled={!detectedStage?.stageName}
            onClick={applyDetected}
          >
            採用
          </button>
        </div>
      )}

      {/* ステージ選択グリッド（confirmed 時は非表示） */}
      {bp.phase !== 'confirmed' && (
        <div className="banpick-grid">
          {fullPool.map((name) => (
            <button
              key={name}
              className={stageButtonClass(name)}
              disabled={usedSet.has(name) || (bp.phase === 'pick' && bp.banned.includes(name))}
              onClick={() => onStageClick(name)}
            >
              <StageTile name={name} />
            </button>
          ))}
        </div>
      )}

      {/* 確定表示（テキスト表記 + 左にアイコン） */}
      {bp.phase === 'confirmed' && (
        <div className="banpick-confirmed">
          <span className="banpick-confirmed-label">確定ステージ</span>
          <div className="banpick-confirmed-body">
            {bp.picked && (
              <img
                className="banpick-confirmed-icon"
                src={stageThumbUrl(bp.picked)}
                alt={bp.picked}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
            <span className="banpick-confirmed-stage">{bp.picked ?? '—'}</span>
          </div>
        </div>
      )}

      {/* フェーズ別の確定/進行ボタン */}
      <div className="banpick-actions">
        {bp.phase === 'ban' && (
          <button className="btn" disabled={bp.banned.length !== MAX_BAN} onClick={confirmBan}>
            確定（BAN {bp.banned.length}/{MAX_BAN}）→ PICK へ
          </button>
        )}
        {bp.phase === 'pick' && (
          <button className="btn" disabled={!bp.picked} onClick={confirmPick}>
            {isGame1 ? '確定' : '確定（PICK）'}
          </button>
        )}
        {bp.phase === 'confirmed' && (
          <button className="btn" disabled={isLastGame} onClick={nextGame}>
            {isLastGame ? `最終試合（BO${maxGames}）` : '次の試合へ'}
          </button>
        )}
      </div>

      {/* 戻る / リセット系 */}
      <div className="banpick-footer">
        <button className="btn-sm" disabled={!canGoBack} onClick={goBack}>
          戻る
        </button>
        <button className="btn-sm" onClick={reset}>
          リセット
        </button>
        <button className="btn-sm btn-next-match" onClick={resetAndNextMatch}>
          リセットして次のマッチへ
        </button>
      </div>

      {/* このマッチのバンピック履歴（確定済みの各試合ステージ） */}
      <div className="banpick-history">
        <span className="banpick-history-label">このマッチの履歴</span>
        {bp.history.length === 0 ? (
          <span className="banpick-history-empty">まだ確定した試合はありません</span>
        ) : (
          <div className="banpick-history-list">
            {bp.history.map((name, i) => (
              <div key={i} className="history-item">
                <div className="stage-btn history-item__tile">
                  <StageTile name={name} />
                </div>
                <span className="history-item__label">第{i + 1}試合</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
