import '@/browser/global.css';
import '../_shared/dashboard.css';
import './mode-select.css';
import { createRoot } from 'react-dom/client';
import { useReplicant } from '@/browser/hooks/useReplicant';

function App() {
  const [activeMode, setActiveMode] = useReplicant('activeMode');
  const [selection] = useReplicant('selection');
  if (activeMode === undefined) return null;

  const switchMode = (next: typeof activeMode) => {
    if (next === activeMode) return;
    const slot = selection?.[activeMode];
    if (slot?.alpha != null || slot?.bravo != null) {
      if (!window.confirm('モードを切り替えるとチーム選択がリセットされます。本当に切り替えますか？')) return;
    }
    void nodecg.sendMessage('resetMode', { mode: activeMode });
    setActiveMode(next);
  };

  return (
    <div className="mode-select-panel">
      <div className="mode-select-buttons">
        <button
          className={`mode-select-btn mode-select-btn--turf-war${activeMode === 'turfWar' ? ' active' : ''}`}
          onClick={() => switchMode('turfWar')}
        >
          ナワバリ
        </button>
        <button
          className={`mode-select-btn mode-select-btn--splat-zones${activeMode === 'splatZones' ? ' active' : ''}`}
          onClick={() => switchMode('splatZones')}
        >
          エリア
        </button>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
