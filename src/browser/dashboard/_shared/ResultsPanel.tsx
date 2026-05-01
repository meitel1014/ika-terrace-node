import './ResultsPanel.css';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useReplicant } from '../../hooks/useReplicant';
import { stripHtml } from '../../utils/stripHtml';
import { Html } from '../../components/Html';
import type { Mode, Side, PickPosition } from '@/nodecg/messages';
import type {
  InGameNames,
  Match,
  MatchCandidate,
  StageNames,
  TeamsPool,
  WeaponAliases,
} from '@/schemas';

type Props = { mode: Mode };

const TOP_N_WEAPONS = 10;

function weaponLabel(id: string, aliases: WeaponAliases | undefined): string {
  if (!id) return '(未選択)';
  return aliases?.[id] ?? id;
}

export function ResultsPanel({ mode }: Props) {
  const [candidates] = useReplicant('matchCandidates');
  const [teamsPool] = useReplicant('teamsPool');
  const [matches] = useReplicant('matches');
  const [aliases] = useReplicant('weaponAliases');
  const [selection] = useReplicant('selection');
  const [stageNames] = useReplicant('stageNames');
  const [inGameNames] = useReplicant('inGameNames');
  const [showAllWeapons, setShowAllWeapons] = useState<Record<string, boolean>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const dragCountRef = useRef(0);

  const recentMatches = useMemo(
    () => [...(matches ?? [])].reverse().slice(0, 5),
    [matches]
  );
  const fullWeaponList = useMemo<string[]>(
    () => Object.keys(aliases ?? {}).sort(),
    [aliases]
  );

  if (!candidates || !teamsPool || !matches || !selection) {
    return <p>読み込み中…</p>;
  }

  const queue = candidates[mode];

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCountRef.current++;
    setIsDragging(true);
  };
  const handleDragLeave = () => {
    dragCountRef.current--;
    if (dragCountRef.current === 0) setIsDragging(false);
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    dragCountRef.current = 0;
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.png') || !file.type.startsWith('image/png')) {
      setUploadError('PNG ファイルをドロップしてください');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    try {
      const content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch('/weapons', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: content,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setUploadError(data.error ?? `エラー (HTTP ${res.status})`);
      }
    } catch {
      setUploadError('アップロード失敗');
    } finally {
      setIsUploading(false);
    }
  };

  const dropZoneProps = {
    onDragEnter: handleDragEnter,
    onDragLeave: handleDragLeave,
    onDragOver: handleDragOver,
    onDrop: (e: React.DragEvent) => { void handleDrop(e); },
  };

  const alphaId = selection[mode].alpha;
  const bravoId = selection[mode].bravo;
  const waitingAlphaTeam = teamsPool[mode].find((t) => t.id === alphaId) ?? null;
  const waitingBravoTeam = teamsPool[mode].find((t) => t.id === bravoId) ?? null;

  return (
    <div className="results-panel">
      {queue.length === 0 ? (
        <div
          className={`results-empty${isDragging ? ' results-empty--dragging' : ''}`}
          {...dropZoneProps}
        >
          {isUploading ? (
            <p>OCR 処理中…</p>
          ) : (
            <>
              <div className="results-grid results-waiting-teams">
                <div className="results-column results-alpha">
                  <h3><span>アルファ | <Html value={waitingAlphaTeam?.name ?? '(未選択)'} /></span></h3>
                </div>
                <div className="results-column results-bravo">
                  <h3><span>ブラボー | <Html value={waitingBravoTeam?.name ?? '(未選択)'} /></span></h3>
                </div>
              </div>
              <p>両チームが表示状態の時、試合開始時自動的にマップ画面を読み取ります。</p>
              <p className="results-drop-hint">
                {isDragging ? 'ここにドロップ' : '送信されなかった場合、 PNG をここにドロップ'}
              </p>
              {uploadError && <p className="results-drop-error">{uploadError}</p>}
              <button
                className="btn btn-manual"
                onClick={() => void nodecg.sendMessage('addManualCandidate', { mode })}
              >
                手動で入力
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="results-queue">
          {queue.map((cand, idx) => (
            <Fragment key={cand.sourceFile + cand.createdAt}>
              <div className="results-queue-item">
                <div className="results-queue-badge">
                  候補 {idx + 1} / {queue.length}
                </div>
                <CandidateEditor
                  mode={mode}
                  candidateIndex={idx}
                  cand={cand}
                  aliases={aliases}
                  teamsPool={teamsPool}
                  stageNames={stageNames}
                  inGameNames={inGameNames}
                  showAllWeapons={showAllWeapons}
                  setShowAllWeapons={setShowAllWeapons}
                  fullWeaponList={fullWeaponList}
                />
              </div>
              {idx === 0 && (
                <div
                  className={`results-drop-compact${isDragging ? ' results-drop-compact--dragging' : ''}`}
                  {...dropZoneProps}
                >
                  {isUploading ? (
                    <span>OCR 処理中…</span>
                  ) : (
                    <span className="results-drop-hint">
                      {isDragging ? 'ここにドロップ' : '次の PNG をここにドロップ'}
                    </span>
                  )}
                  {uploadError && <span className="results-drop-error">{uploadError}</span>}
                </div>
              )}
            </Fragment>
          ))}
        </div>
      )}

      <section className="results-history">
        <h4>最新の確定履歴（最大 5 件）</h4>
        {recentMatches.length === 0 ? (
          <p className="results-empty-sm">まだ確定済みの試合はありません。</p>
        ) : (
          <ul>
            {recentMatches.map((m) => (
              <HistoryItem key={m.id} match={m} aliases={aliases} teamsPool={teamsPool} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ── 判定結果エディタ（未確定 candidate の編集 UI） ─────────────

type EditorProps = {
  mode: Mode;
  candidateIndex: number;
  cand: MatchCandidate;
  aliases: WeaponAliases | undefined;
  teamsPool: TeamsPool;
  stageNames: StageNames | undefined;
  inGameNames: InGameNames | undefined;
  showAllWeapons: Record<string, boolean>;
  setShowAllWeapons: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  fullWeaponList: string[];
};

function CandidateEditor({
  mode,
  candidateIndex,
  cand,
  aliases,
  teamsPool,
  stageNames,
  inGameNames,
  showAllWeapons,
  setShowAllWeapons,
  fullWeaponList,
}: EditorProps) {
  const alphaTeam = teamsPool[mode].find((t) => t.id === cand.alpha.teamId) ?? null;
  const bravoTeam = teamsPool[mode].find((t) => t.id === cand.bravo.teamId) ?? null;

  // ブキ編成フラッシュ: OCR由来の候補がマウントされた瞬間に1回点灯
  const [weaponsFlash, setWeaponsFlash] = useState(!cand.isManual);

  // 勝利サイドフラッシュ: wonSideが null→値 に変化したとき5回点滅（手動操作時は除外）
  const [wonSideFlash, setWonSideFlash] = useState<Side | null>(null);
  const prevWonSideRef = useRef<Side | null | undefined>(undefined);
  const manualWonSideRef = useRef(false);
  useEffect(() => {
    if (manualWonSideRef.current) {
      manualWonSideRef.current = false;
    } else if (
      prevWonSideRef.current !== undefined &&
      cand.wonSide !== prevWonSideRef.current &&
      cand.wonSide !== null
    ) {
      setWonSideFlash(cand.wonSide);
    }
    prevWonSideRef.current = cand.wonSide;
  }, [cand.wonSide]);

  // ステージフラッシュ: /stage 自動入力時のみ点灯（手動選択時はスキップ）
  const [stageFlash, setStageFlash] = useState(false);
  const prevStageNameRef = useRef<string | null | undefined>(undefined);
  const manualStageRef = useRef(false);
  useEffect(() => {
    if (manualStageRef.current) {
      manualStageRef.current = false;
    } else if (
      prevStageNameRef.current !== undefined &&
      cand.stageName !== prevStageNameRef.current &&
      cand.stageName !== null
    ) {
      setStageFlash(true);
    }
    prevStageNameRef.current = cand.stageName;
  }, [cand.stageName]);

  const handleConfirm = () => {
    if (!cand.stageName) {
      alert('ステージを選択してください');
      return;
    }
    if (!cand.wonSide) {
      alert('勝利チームを選択してください');
      return;
    }
    for (const side of ['alpha', 'bravo'] as const) {
      const names = cand[side].picks.map((p) => p.selected.playerName).filter(Boolean);
      const dupes = names.filter((n, i) => names.indexOf(n) !== i);
      if (dupes.length > 0) {
        alert(`${side === 'alpha' ? 'アルファ' : 'ブラボー'}に同じプレイヤー名が複数選択されています：${[...new Set(dupes)].join('、')}`);
        return;
      }
    }
    void nodecg.sendMessage('confirmMatchCandidate', { mode, candidateIndex });
    setShowAllWeapons({});
  };
  const handleWonSideChange = (side: Side) => {
    manualWonSideRef.current = true;
    const newWonSide = cand.wonSide === side ? null : side;
    void nodecg.sendMessage('setMatchCandidateWonSide', { mode, candidateIndex, wonSide: newWonSide });
  };
  const handleDismiss = () => {
    void nodecg.sendMessage('dismissMatchCandidate', { mode, candidateIndex });
    setShowAllWeapons({});
  };
  const handlePlayerChange = (side: Side, position: PickPosition, playerName: string) => {
    void nodecg.sendMessage('updateMatchCandidate', {
      mode,
      candidateIndex,
      side,
      position,
      patch: { playerName },
    });
  };
  const handleStageChange = (stageName: string) => {
    manualStageRef.current = true;
    void nodecg.sendMessage('setMatchCandidateStageName', { mode, candidateIndex, stageName });
  };
  const handleWeaponChange = (side: Side, position: PickPosition, weaponId: string) => {
    void nodecg.sendMessage('updateMatchCandidate', {
      mode,
      candidateIndex,
      side,
      position,
      patch: { weaponId },
    });
  };

  return (
    <div className="results-editor">
      <div className="results-header">
        <div
          className={`results-stage${stageFlash ? ' flash-stage' : ''}`}
          onAnimationEnd={() => setStageFlash(false)}
        >
          <label className="results-stage-label">ステージ</label>
          <select
            className="results-stage-select"
            value={cand.stageName ?? ''}
            onChange={(e) => handleStageChange(e.target.value)}
          >
            <option value="">(未設定)</option>
            {(stageNames?.[mode] ?? []).map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          {(() => {
            const score = cand.stageScores.find((s) => s.stageName === cand.stageName)?.score
              ?? (cand.stageName ? cand.stageScore : null);
            return score !== null && score !== undefined ? (
              <span className="results-stage-score">{(score * 100).toFixed(1)}%</span>
            ) : null;
          })()}
          {cand.stageName && (
            <img
              className="results-stage-icon"
              src={`/stage-icons/${encodeURIComponent(cand.stageName)}.png`}
              alt={cand.stageName}
            />
          )}
        </div>
      </div>

      {/* アルファ/ブラボーを1つのテーブルに統合してヘッダー行の高さを揃える */}
      <div
        className={`results-table-wrapper${weaponsFlash ? ' flash-weapons' : ''}`}
        onAnimationEnd={(e) => { if (e.currentTarget === e.target) setWeaponsFlash(false); }}
      >
        <table className="results-table">
          <thead>
            <tr>
              <th
                colSpan={3}
                className={`results-side-header results-alpha-header${wonSideFlash === 'alpha' ? ' flash-winner-alpha' : ''}`}
                onAnimationEnd={(e) => { if (e.currentTarget === e.target) setWonSideFlash(null); }}
              >
                <div className="results-side-header-inner">
                  <span>アルファ | <Html value={alphaTeam?.name ?? '(未選択)'} /></span>
                  <button
                    className={`btn-sm btn-winner btn-winner--alpha${cand.wonSide === 'alpha' ? ' btn-winner--selected' : ''}`}
                    onClick={() => handleWonSideChange('alpha')}
                  >
                    勝利
                  </button>
                </div>
              </th>
              <th className="results-spacer-col" />
              <th
                colSpan={3}
                className={`results-side-header results-bravo-header${wonSideFlash === 'bravo' ? ' flash-winner-bravo' : ''}`}
                onAnimationEnd={(e) => { if (e.currentTarget === e.target) setWonSideFlash(null); }}
              >
                <div className="results-side-header-inner">
                  <span>ブラボー | <Html value={bravoTeam?.name ?? '(未選択)'} /></span>
                  <button
                    className={`btn-sm btn-winner btn-winner--bravo${cand.wonSide === 'bravo' ? ' btn-winner--selected' : ''}`}
                    onClick={() => handleWonSideChange('bravo')}
                  >
                    勝利
                  </button>
                </div>
              </th>
            </tr>
            <tr>
              <th />
              <th>プレイヤー</th>
              <th>ブキ</th>
              <th className="results-spacer-col" />
              <th className="results-bravo-pos" />
              <th>プレイヤー</th>
              <th>ブキ</th>
            </tr>
          </thead>
          <tbody>
            {cand.alpha.picks.map((alphaPick, i) => {
              const bravoPick = cand.bravo.picks[i];
              const alphaPlayerOptions = alphaTeam?.players ?? (['', '', '', ''] as const);
              const bravoPlayerOptions = bravoTeam?.players ?? (['', '', '', ''] as const);
              const alphaKey = `${candidateIndex}-alpha-${alphaPick.position}`;
              const bravoKey = `${candidateIndex}-bravo-${bravoPick.position}`;
              const alphaShowAll = showAllWeapons[alphaKey] ?? false;
              const bravoShowAll = showAllWeapons[bravoKey] ?? false;
              const alphaWeaponOptions =
                (alphaShowAll || alphaPick.weaponCandidates.length === 0) && fullWeaponList.length > 0
                  ? fullWeaponList
                  : alphaPick.weaponCandidates.slice(0, TOP_N_WEAPONS);
              const bravoWeaponOptions =
                (bravoShowAll || bravoPick.weaponCandidates.length === 0) && fullWeaponList.length > 0
                  ? fullWeaponList
                  : bravoPick.weaponCandidates.slice(0, TOP_N_WEAPONS);

              return (
                <tr key={alphaPick.position}>
                  {/* アルファ: 番号 */}
                  <th>{alphaPick.position + 1}</th>

                  {/* アルファ: プレイヤー */}
                  <td className="results-alpha-td">
                    {alphaPick.nameImageDataUrl && (
                      <img className="name-region-img" src={alphaPick.nameImageDataUrl} alt="" />
                    )}
                    <select
                      value={alphaPick.selected.playerName}
                      onChange={(e) => handlePlayerChange('alpha', alphaPick.position, e.target.value)}
                    >
                      {alphaPick.selected.playerName &&
                      !alphaPlayerOptions.includes(alphaPick.selected.playerName) ? (
                        <option value={alphaPick.selected.playerName}>
                          {alphaPick.selected.playerName}（候補外）
                        </option>
                      ) : null}
                      {alphaPlayerOptions.map((name, j) => (
                        <option key={j} value={name}>
                          {stripHtml(name) || '(空欄)'}
                        </option>
                      ))}
                    </select>
                    {alphaPick.selected.playerName && !cand.isManual ? (
                      <span className="player-ingame-name">
                        {inGameNames?.[alphaPick.selected.playerName] ?? alphaPick.selected.playerName}
                      </span>
                    ) : null}
                  </td>

                  {/* アルファ: ブキ */}
                  <td className="results-alpha-td">
                    {alphaPick.weaponImageDataUrl && (
                      <img className="weapon-region-img" src={alphaPick.weaponImageDataUrl} alt="" />
                    )}
                    <select
                      value={alphaPick.selected.weaponId}
                      onChange={(e) => handleWeaponChange('alpha', alphaPick.position, e.target.value)}
                    >
                      {cand.isManual && <option value="">(未選択)</option>}
                      {alphaPick.selected.weaponId &&
                      !alphaWeaponOptions.includes(alphaPick.selected.weaponId) ? (
                        <option value={alphaPick.selected.weaponId}>
                          {weaponLabel(alphaPick.selected.weaponId, aliases)}
                        </option>
                      ) : null}
                      {alphaWeaponOptions.map((wid) => (
                        <option key={wid} value={wid}>
                          {weaponLabel(wid, aliases)}
                        </option>
                      ))}
                    </select>
                    {!cand.isManual && (
                      <label className="weapon-toggle">
                        <input
                          type="checkbox"
                          checked={alphaShowAll}
                          onChange={() =>
                            setShowAllWeapons((prev) => ({ ...prev, [alphaKey]: !prev[alphaKey] }))
                          }
                        />
                        すべて
                      </label>
                    )}
                  </td>

                  {/* スペーサー */}
                  <td className="results-spacer-col" />

                  {/* ブラボー: 番号 */}
                  <th className="results-bravo-pos">{bravoPick.position + 1}</th>

                  {/* ブラボー: プレイヤー */}
                  <td className="results-bravo-td">
                    {bravoPick.nameImageDataUrl && (
                      <img className="name-region-img" src={bravoPick.nameImageDataUrl} alt="" />
                    )}
                    <select
                      value={bravoPick.selected.playerName}
                      onChange={(e) => handlePlayerChange('bravo', bravoPick.position, e.target.value)}
                    >
                      {bravoPick.selected.playerName &&
                      !bravoPlayerOptions.includes(bravoPick.selected.playerName) ? (
                        <option value={bravoPick.selected.playerName}>
                          {bravoPick.selected.playerName}（候補外）
                        </option>
                      ) : null}
                      {bravoPlayerOptions.map((name, j) => (
                        <option key={j} value={name}>
                          {stripHtml(name) || '(空欄)'}
                        </option>
                      ))}
                    </select>
                    {bravoPick.selected.playerName && !cand.isManual ? (
                      <span className="player-ingame-name">
                        {inGameNames?.[bravoPick.selected.playerName] ?? bravoPick.selected.playerName}
                      </span>
                    ) : null}
                  </td>

                  {/* ブラボー: ブキ */}
                  <td className="results-bravo-td">
                    {bravoPick.weaponImageDataUrl && (
                      <img className="weapon-region-img" src={bravoPick.weaponImageDataUrl} alt="" />
                    )}
                    <select
                      value={bravoPick.selected.weaponId}
                      onChange={(e) => handleWeaponChange('bravo', bravoPick.position, e.target.value)}
                    >
                      {cand.isManual && <option value="">(未選択)</option>}
                      {bravoPick.selected.weaponId &&
                      !bravoWeaponOptions.includes(bravoPick.selected.weaponId) ? (
                        <option value={bravoPick.selected.weaponId}>
                          {weaponLabel(bravoPick.selected.weaponId, aliases)}
                        </option>
                      ) : null}
                      {bravoWeaponOptions.map((wid) => (
                        <option key={wid} value={wid}>
                          {weaponLabel(wid, aliases)}
                        </option>
                      ))}
                    </select>
                    {!cand.isManual && (
                      <label className="weapon-toggle">
                        <input
                          type="checkbox"
                          checked={bravoShowAll}
                          onChange={() =>
                            setShowAllWeapons((prev) => ({ ...prev, [bravoKey]: !prev[bravoKey] }))
                          }
                        />
                        すべて
                      </label>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="results-actions">
        <button className="btn btn-confirm" onClick={handleConfirm}>
          確定して記録
        </button>
        <button className="btn btn-dismiss" onClick={handleDismiss}>
          破棄
        </button>
      </div>
      {cand.annotatedFile && (
        <details className="results-annotated-details">
          <summary aria-label="判定領域の表示切替"></summary>
          <img
            className="results-annotated-img"
            src={`/annotated-screenshots/${cand.annotatedFile}`}
            alt="判定領域"
            loading="lazy"
          />
        </details>
      )}
      <div className="results-source">
        {cand.isManual
          ? '手動入力'
          : <>元: <code>{cand.sourceFile}</code>（{new Date(cand.createdAt).toLocaleTimeString()}）</>
        }
      </div>
    </div>
  );
}

// ── 履歴表示 ─────────────────────────────────

type HistoryItemProps = {
  match: Match;
  aliases: WeaponAliases | undefined;
  teamsPool: TeamsPool;
};

function HistoryItem({ match, aliases, teamsPool }: HistoryItemProps) {
  const [open, setOpen] = useState(false);
  const pool = teamsPool[match.mode];
  const alphaName = pool.find((t) => t.id === match.alpha.teamId)?.name ?? match.alpha.teamId;
  const bravoName = pool.find((t) => t.id === match.bravo.teamId)?.name ?? match.bravo.teamId;

  const handleDelete = () => {
    if (!confirm('この試合記録を削除しますか？')) return;
    void nodecg.sendMessage('deleteMatch', { id: match.id });
  };

  return (
    <li className="history-item">
      <button
        type="button"
        className="history-head"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="history-time">
          {new Date(match.timestamp).toLocaleTimeString()}
        </span>
        <span className="history-teams">
          <Html value={alphaName} /> <span className="vs">vs</span>{' '}
          <Html value={bravoName} />
        </span>
        <span className="history-toggle">{open ? '▲' : '▼'}</span>
      </button>
      {open ? (
        <div className="history-detail">
          <HistorySide title="アルファ" name={alphaName} picks={match.alpha.picks} aliases={aliases} />
          <HistorySide title="ブラボー" name={bravoName} picks={match.bravo.picks} aliases={aliases} />
          <button className="btn-sm btn-cancel" onClick={handleDelete}>
            この記録を削除
          </button>
        </div>
      ) : null}
    </li>
  );
}

function HistorySide({
  title,
  name,
  picks,
  aliases,
}: {
  title: string;
  name: string;
  picks: Match['alpha']['picks'];
  aliases: WeaponAliases | undefined;
}) {
  return (
    <div className="history-side">
      <h5>
        {title}：<Html value={name} />
      </h5>
      <ol>
        {picks.map((p, i) => (
          <li key={i}>
            {stripHtml(p.playerName)} — {weaponLabel(p.weaponId, aliases)}
          </li>
        ))}
      </ol>
    </div>
  );
}
