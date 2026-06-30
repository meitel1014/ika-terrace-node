import './PreviewEditPanel.css';
import { Fragment, useEffect, useState } from 'react';
import { useReplicant } from '../../hooks/useReplicant';
import { stripHtml } from '../../utils/stripHtml';
import type { Side } from '@/nodecg/messages';
import type { Team } from '@/schemas';

type EditTarget = {
  side: Side;
  value: string;
};

type EditPlayerTarget = {
  side: Side;
  idx: number;
  oldPlayerName: string;
  value: string;
};

const PLAYER_LABELS = ['プレイヤー1', 'プレイヤー2', 'プレイヤー3', 'プレイヤー4'] as const;

export function PreviewEditPanel() {
  const [teamsPool] = useReplicant('teamsPool');
  const [selection] = useReplicant('selection');
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [editPlayer, setEditPlayer] = useState<EditPlayerTarget | null>(null);

  useEffect(() => {
    setEditTarget(null);
    setEditPlayer(null);
  }, [selection?.alpha, selection?.bravo]);

  if (!teamsPool || !selection) return <p>読み込み中…</p>;

  const findTeam = (id: string | null) =>
    id ? teamsPool.find((t) => t.id === id) ?? null : null;

  const alphaTeam = findTeam(selection.alpha);
  const bravoTeam = findTeam(selection.bravo);

  // ── チーム表示名の編集 ──
  const startEdit = (side: Side, team: Team) => {
    setEditPlayer(null);
    setEditTarget({ side, value: team.viewname });
  };
  const cancelEdit = () => setEditTarget(null);
  const saveEdit = () => {
    if (!editTarget) return;
    const team = editTarget.side === 'alpha' ? alphaTeam : bravoTeam;
    if (!team) return;
    void nodecg.sendMessage('updateTeam', {
      teamId: team.id,
      patch: { viewname: editTarget.value },
    });
    setEditTarget(null);
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') saveEdit();
    if (e.key === 'Escape') cancelEdit();
  };

  // ── プレイヤー名の編集 ──
  const startPlayerEdit = (side: Side, idx: number, playerName: string) => {
    setEditTarget(null);
    setEditPlayer({ side, idx, oldPlayerName: playerName, value: playerName });
  };
  const cancelPlayerEdit = () => setEditPlayer(null);
  const savePlayerEdit = () => {
    if (!editPlayer) return;
    const { side, idx, oldPlayerName, value } = editPlayer;
    const newPlayerName = value.trim();
    const team = side === 'alpha' ? alphaTeam : bravoTeam;
    if (!team || !newPlayerName || newPlayerName === oldPlayerName) {
      setEditPlayer(null);
      return;
    }
    const newPlayers = [...team.players] as [string, string, string, string];
    newPlayers[idx] = newPlayerName;
    void nodecg.sendMessage('updateTeam', {
      teamId: team.id,
      patch: { players: newPlayers },
    });
    setEditPlayer(null);
  };
  const handlePlayerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') savePlayerEdit();
    if (e.key === 'Escape') cancelPlayerEdit();
  };

  // ── セルレンダラー（side ごとにラベル込み 3 セルを返す） ──

  const renderViewnameCells = (side: Side, team: Team | null) => {
    const labelClass = `preview-row-label${side === 'bravo' ? ' preview-bravo-col' : ''}`;
    if (!team) {
      return (
        <>
          <th className={labelClass}>チーム名 (左右用)</th>
          <td />
          <td className="action-cell" />
        </>
      );
    }
    const isEditing = editTarget?.side === side;
    return (
      <>
        <th className={labelClass}>チーム名 (左右用)</th>
        <td>
          {isEditing ? (
            <input
              className="edit-input"
              value={editTarget.value}
              onChange={(e) => setEditTarget({ ...editTarget, value: e.target.value })}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          ) : (
            <span className="field-value">{team.viewname}</span>
          )}
        </td>
        <td className="action-cell">
          {isEditing ? (
            <>
              <button className="btn-sm btn-save" onClick={saveEdit}>保存</button>
              <button className="btn-sm btn-cancel" onClick={cancelEdit}>取消</button>
            </>
          ) : (
            <button className="btn-sm btn-edit" onClick={() => startEdit(side, team)}>
              編集
            </button>
          )}
        </td>
      </>
    );
  };

  const renderPlayerNameCells = (side: Side, team: Team | null, idx: number) => {
    const labelClass = `preview-row-label${side === 'bravo' ? ' preview-bravo-col' : ''}`;
    if (!team) {
      return (
        <>
          <th className={labelClass}>{PLAYER_LABELS[idx]}</th>
          <td />
          <td className="action-cell" />
        </>
      );
    }
    const playerName = team.players[idx] ?? '';
    const isEditing = editPlayer?.side === side && editPlayer?.idx === idx;
    return (
      <>
        <th className={labelClass}>{PLAYER_LABELS[idx]}</th>
        <td>
          {isEditing ? (
            <input
              className="edit-input"
              value={editPlayer.value}
              onChange={(e) => setEditPlayer({ ...editPlayer, value: e.target.value })}
              onKeyDown={handlePlayerKeyDown}
              autoFocus
            />
          ) : (
            <span className="field-value">
              {stripHtml(playerName) || '(空欄)'}
            </span>
          )}
        </td>
        <td className="action-cell">
          {isEditing ? (
            <>
              <button className="btn-sm btn-save" onClick={savePlayerEdit}>保存</button>
              <button className="btn-sm btn-cancel" onClick={cancelPlayerEdit}>取消</button>
            </>
          ) : (
            <button className="btn-sm btn-edit" onClick={() => startPlayerEdit(side, idx, playerName)}>
              編集
            </button>
          )}
        </td>
      </>
    );
  };

  return (
    <div className="preview-edit-panel">
      <table className="preview-table">
        <colgroup>
          <col className="preview-col-label" />
          <col className="preview-col-text"/>
          <col className="preview-col-action" />
          <col className="preview-col-spacer" />
          <col className="preview-col-label" />
          <col className="preview-col-text"/>
          <col className="preview-col-action" />
        </colgroup>
        <thead>
          <tr>
            <th colSpan={3} className="preview-alpha-header">
              アルファ{alphaTeam ? ` | ${alphaTeam.name}` : ''}
            </th>
            <th className="preview-spacer-col" />
            <th colSpan={3} className="preview-bravo-header">
              ブラボー{bravoTeam ? ` | ${bravoTeam.name}` : ''}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            {renderViewnameCells('alpha', alphaTeam)}
            <td className="preview-spacer-col" />
            {renderViewnameCells('bravo', bravoTeam)}
          </tr>
          {[0, 1, 2, 3].map((idx) => (
            <Fragment key={idx}>
              <tr>
                {renderPlayerNameCells('alpha', alphaTeam, idx)}
                <td className="preview-spacer-col" />
                {renderPlayerNameCells('bravo', bravoTeam, idx)}
              </tr>
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
