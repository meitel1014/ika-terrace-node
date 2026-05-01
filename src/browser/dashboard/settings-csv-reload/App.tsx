import { useRef, useState } from 'react';
import { statusLabel, useReloadButton, type Status } from '../_shared/useReloadButton';

function uploadLabel(status: Status): string {
  if (status === 'loading') return 'アップロード中…';
  if (status === 'done') return '完了';
  if (status === 'error') return 'アップロード失敗';
  return '参照…';
}

export function CsvReloadPanel() {
  const teams = useReloadButton('reloadTeamsCsv');
  const [uploadStatus, setUploadStatus] = useState<Status>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploadStatus('loading');
    try {
      const text = await file.text();
      const res = await fetch('/upload-teams-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        body: text,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      setUploadStatus('done');
      setTimeout(() => setUploadStatus('idle'), 2000);
    } catch (err) {
      console.error('[upload-teams-csv]', err);
      setUploadStatus('error');
      setTimeout(() => setUploadStatus('idle'), 3000);
    }
  };

  return (
    <div className="csv-reload-panel">
      <p>
        <code>data/teams.csv</code> からチーム情報を再読み込みします。
        <br />
        編集内容はすべて破棄されます。
      </p>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={teams.handle}
          disabled={teams.status === 'loading'}
          className="btn btn-reload"
        >
          {statusLabel(teams.status, 'チーム情報CSV再読込')}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          onChange={(e) => { void handleFileChange(e); }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadStatus === 'loading'}
          className="btn btn-reload"
        >
          {uploadLabel(uploadStatus)}
        </button>
      </div>

    </div>
  );
}
