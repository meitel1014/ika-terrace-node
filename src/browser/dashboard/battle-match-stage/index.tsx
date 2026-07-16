import '@/browser/global.css';
import '../_shared/dashboard.css';
import './match-stage.css';
import { createRoot } from 'react-dom/client';
import { MatchStagePanel } from './App';

createRoot(document.getElementById('root')!).render(<MatchStagePanel />);
