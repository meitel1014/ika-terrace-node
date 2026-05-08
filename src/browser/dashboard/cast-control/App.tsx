import { useState, useEffect, useMemo, useRef } from 'react';
import { useReplicant } from '@/browser/hooks/useReplicant';
import { type Status } from '../_shared/useReloadButton';
import type { CastMembers } from '@/schemas';

const EMPTY: CastMembers = { announcer: '', commentator: '', operator: '', observer: '' };

type FieldKey = keyof CastMembers;

const FIELDS: { key: FieldKey; label: string; candidatesKey: 'cast' | 'operator' | 'observer' }[] = [
  { key: 'announcer', label: '実況', candidatesKey: 'cast' },
  { key: 'commentator', label: '解説', candidatesKey: 'cast' },
  { key: 'operator', label: '配信', candidatesKey: 'operator' },
  { key: 'observer', label: 'オブザーバー', candidatesKey: 'observer' },
];

function applyLabel(isDirty: boolean, status: Status): string {
  if (status === 'loading') return '適用中…';
  if (status === 'done') return '適用完了';
  if (status === 'error') return '適用失敗';
  return isDirty ? '適用 *' : '適用';
}

type ComboFieldProps = {
  id: string;
  label: string;
  candidates: string[];
  value: string;
  onChange: (v: string) => void;
};

function ComboField({ id, label, candidates, value, onChange }: ComboFieldProps) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ドロップダウン外クリックで閉じる
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const openDropdown = () => {
    setOpen(true);
    setActiveIdx(-1);
  };

  const selectCandidate = (name: string) => {
    onChange(name);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') openDropdown();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, candidates.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault();
      selectCandidate(candidates[activeIdx]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div ref={wrapRef} className="combobox-wrap">
        <input
          ref={inputRef}
          id={id}
          type="text"
          className="combobox-input"
          value={value}
          onFocus={openDropdown}
          onChange={(e) => { onChange(e.target.value); setOpen(true); }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        <span className="combobox-arrow">▼</span>
        {open && candidates.length > 0 && (
          <ul className="combobox-dropdown">
            {candidates.map((name, i) => (
              <li
                key={name}
                data-active={i === activeIdx ? 'true' : undefined}
                onMouseDown={(e) => {
                  e.preventDefault(); // input の blur を防ぐ
                  selectCandidate(name);
                }}
              >
                {name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
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
      {FIELDS.map(({ key, label, candidatesKey }) => (
        <ComboField
          key={key}
          id={`cast-field-${key}`}
          label={label}
          candidates={candidates?.[candidatesKey] ?? []}
          value={local[key]}
          onChange={(v) => setField(key, v)}
        />
      ))}

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
