import { useState, useEffect, useMemo } from 'react';
import { useReplicant } from '@/browser/hooks/useReplicant';
import { type Status } from '../_shared/useReloadButton';
import type { CastMembers } from '@/schemas';

const EMPTY: CastMembers = { announcer: '', commentator: '', operator: '', observer: '' };

type FieldKey = keyof CastMembers;

const FIELDS: { key: FieldKey; label: string; candidatesKey: 'cast' | 'operator' | 'observer' }[] = [
  { key: 'announcer', label: '実況', candidatesKey: 'cast' },
  { key: 'commentator', label: '解説', candidatesKey: 'cast' },
];

function applyLabel(isDirty: boolean, status: Status): string {
  if (status === 'loading') return '適用中…';
  if (status === 'done') return '適用完了';
  if (status === 'error') return '適用失敗';
  return isDirty ? '適用 *' : '適用';
}

export function CastControlPanel() {
  const [members] = useReplicant('castMembers');
  const [candidates] = useReplicant('castCandidates');

  const [local, setLocal] = useState<CastMembers>(EMPTY);
  const [applyStatus, setApplyStatus] = useState<Status>('idle');

  useEffect(() => {
    if (members) setLocal(members);
  }, [members]);

  const isDirty = useMemo(
    () => JSON.stringify(local) !== JSON.stringify(members ?? EMPTY),
    [local, members]
  );

  const handleApply = () => {
    setApplyStatus('loading');
    void nodecg.sendMessage('setCastMembers', local).then(
      () => { setApplyStatus('done'); setTimeout(() => setApplyStatus('idle'), 2000); },
      () => { setApplyStatus('error'); setTimeout(() => setApplyStatus('idle'), 3000); }
    );
  };

  const setField = (key: FieldKey, value: string) =>
    setLocal((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="cast-control-panel" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {FIELDS.map(({ key, label, candidatesKey }) => {
        const opts = candidates?.[candidatesKey] ?? [];
        return (
          <div key={key} className="field">
            <label htmlFor={`cast-field-${key}`}>{label}</label>
            <select
              id={`cast-field-${key}`}
              value={local[key]}
              onChange={(e) => setField(key, e.target.value)}
            >
              <option value="">-- 選択してください --</option>
              {opts.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        );
      })}

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={handleApply}
          disabled={applyStatus === 'loading'}
          className={`btn ${isDirty ? 'btn-primary' : 'btn-reload'}`}
        >
          {applyLabel(isDirty, applyStatus)}
        </button>
      </div>
    </div>
  );
}
