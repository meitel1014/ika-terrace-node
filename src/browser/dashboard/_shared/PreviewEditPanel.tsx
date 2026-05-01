import './PreviewEditPanel.css';
import { Fragment, useState } from 'react';
import { useReplicant } from '../../hooks/useReplicant';
import { Html } from '../../components/Html';
import { stripHtml } from '../../utils/stripHtml';
import type { Mode, Side } from '@/nodecg/messages';
import type { Team } from '@/schemas';

type Props = { mode: Mode };

type EditTarget = {
  side: Side;
  field: 'name' | 'alias';
  value: string;
};

type EditInGameTarget = {
  playerName: string;
  value: string;
};

function getFieldValue(team: Team, field: EditTarget['field']): string {
  if (field === 'name') return team.name;
  return team.alias;
}

function buildPatch(field: EditTarget['field'], value: string): Partial<Team> {
  if (field === 'name') return { name: value };
  return { alias: value };
}

const PLAYER_LABELS = ['プレイヤー1', 'プレイヤー2', 'プレイヤー3', 'プレイヤー4'] as const;
const TEAM_FIELDS: { field: EditTarget['field']; label: string }[] = [
  { field: 'alias', label: '二つ名' },
  { field: 'name', label: 'チーム名 (左右用)' },
];

export function PreviewEditPanel({ mode }: Props) {
  const [teamsPool] = useReplicant('teamsPool');
  const [selection] = useReplicant('selection');
  const [inGameNames] = useReplicant('inGameNames');
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [editInGame, setEditInGame] = useState<EditInGameTarget | null>(null);

  if (!teamsPool || !selection) return <p>読み込み中…</p>;

  const slot = selection[mode];
  const teams = teamsPool[mode];

  const findTeam = (id: string | null) =>
    id ? teams.find((t) => t.id === id) ?? null : null;

  const alphaTeam = findTeam(slot.alpha);
  const bravoTeam = findTeam(slot.bravo);

  // ── チーム情報（alias / name）の編集 ──
  const startEdit = (side: Side, field: EditTarget['field'], team: Team) => {
    setEditInGame(null);
    setEditTarget({ side, field, value: getFieldValue(team, field) });
  };
  const cancelEdit = () => setEditTarget(null);
  const saveEdit = () => {
    if (!editTarget) return;
    const team = editTarget.side === 'alpha' ? alphaTeam : bravoTeam;
    if (!team) return;
    void nodecg.sendMessage('updateTeam', {
      mode,
      teamId: team.id,
      patch: buildPatch(editTarget.field, editTarget.value),
    });
    setEditTarget(null);
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') saveEdit();
    if (e.key === 'Escape') cancelEdit();
  };

  // ── ゲーム内名前の編集 ──
  const startInGameEdit = (playerName: string, currentInGame: string) => {
    setEditTarget(null);
    setEditInGame({ playerName, value: currentInGame });
  };
  const cancelInGameEdit = () => setEditInGame(null);
  const saveInGameEdit = () => {
    if (!editInGame) return;
    void nodecg.sendMessage('setInGameName', {
      playerName: editInGame.playerName,
      inGameName: editInGame.value,
    });
    setEditInGame(null);
  };
  const handleInGameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') saveInGameEdit();
    if (e.key === 'Escape') cancelInGameEdit();
  };

  // ── セルレンダラー（side ごとにラベル込み 3 セルを返す） ──

  const renderFieldCells = (side: Side, field: EditTarget['field'], team: Team | null, label: string) => {
    const labelClass = `preview-row-label${side === 'bravo' ? ' preview-bravo-col' : ''}`;
    if (!team) {
      return (
        <>
          <th className={labelClass}>{label}</th>
          <td />
          <td className="action-cell" />
        </>
      );
    }
    const isEditing = editTarget?.side === side && editTarget?.field === field;
    const displayValue = getFieldValue(team, field);
    return (
      <>
        <th className={labelClass}>{label}</th>
        <td>
          {isEditing ? (
            <input
              className="edit-input"
              value={editTarget.value}
              onChange={(e) => setEditTarget({ ...editTarget, value: e.target.value })}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          ) : field === 'name' ? (
            <span className="field-value">{displayValue}</span>
          ) : (
            <Html value={displayValue} as="span" className="field-value" />
          )}
        </td>
        <td className="action-cell">
          {isEditing ? (
            <>
              <button className="btn-sm btn-save" onClick={saveEdit}>保存</button>
              <button className="btn-sm btn-cancel" onClick={cancelEdit}>取消</button>
            </>
          ) : (
            <button className="btn-sm btn-edit" onClick={() => startEdit(side, field, team)}>
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
    return (
      <>
        <th className={labelClass}>{PLAYER_LABELS[idx]}</th>
        <td>
          <span className="field-value field-value--readonly">
            {stripHtml(playerName) || '(空欄)'}
          </span>
        </td>
        <td className="action-cell" />
      </>
    );
  };

  const renderInGameCells = (side: Side, team: Team | null, idx: number) => {
    const labelClass = `preview-ingame-label${side === 'bravo' ? ' preview-bravo-col' : ''}`;
    if (!team) {
      return (
        <>
          <th className={labelClass}>↳ゲーム内</th>
          <td />
          <td className="action-cell" />
        </>
      );
    }
    const playerName = team.players[idx] ?? '';
    const currentInGame = inGameNames?.[playerName] ?? playerName;
    const isEditingInGame = editInGame?.playerName === playerName;
    const isDifferent = currentInGame !== playerName;
    return (
      <>
        <th className={labelClass}>↳ゲーム内</th>
        <td>
          {isEditingInGame ? (
            <input
              className="edit-input"
              value={editInGame.value}
              onChange={(e) => setEditInGame({ ...editInGame, value: e.target.value })}
              onKeyDown={handleInGameKeyDown}
              autoFocus
            />
          ) : (
            <span className={`field-value${isDifferent ? ` field-value--ingame field-value--ingame-${side}` : ''}`}>
              {currentInGame || '(空欄)'}
            </span>
          )}
        </td>
        <td className="action-cell">
          {isEditingInGame ? (
            <>
              <button className="btn-sm btn-save" onClick={saveInGameEdit}>保存</button>
              <button className="btn-sm btn-cancel" onClick={cancelInGameEdit}>取消</button>
            </>
          ) : (
            <button
              className="btn-sm btn-edit"
              onClick={() => startInGameEdit(playerName, currentInGame)}
            >
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
        <thead>
          <tr>
            <th colSpan={3} className="preview-alpha-header">
              アルファ{alphaTeam ? ` | ${alphaTeam.id}` : ''}
            </th>
            <th className="preview-spacer-col" />
            <th colSpan={3} className="preview-bravo-header">
              ブラボー{bravoTeam ? ` | ${bravoTeam.id}` : ''}
            </th>
          </tr>
        </thead>
        <tbody>
          {TEAM_FIELDS.map(({ field, label }) => (
            <tr key={field}>
              {renderFieldCells('alpha', field, alphaTeam, label)}
              <td className="preview-spacer-col" />
              {renderFieldCells('bravo', field, bravoTeam, label)}
            </tr>
          ))}
          {[0, 1, 2, 3].map((idx) => (
            <Fragment key={idx}>
              <tr>
                {renderPlayerNameCells('alpha', alphaTeam, idx)}
                <td className="preview-spacer-col" />
                {renderPlayerNameCells('bravo', bravoTeam, idx)}
              </tr>
              <tr className="preview-ingame-row">
                {renderInGameCells('alpha', alphaTeam, idx)}
                <td className="preview-spacer-col" />
                {renderInGameCells('bravo', bravoTeam, idx)}
              </tr>
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
