import '@/browser/global.css';
import '../_shared/dashboard.css';
import './stage-rule.css';
import { createRoot } from 'react-dom/client';
import { StageRulePanel } from './App';

createRoot(document.getElementById('root')!).render(<StageRulePanel />);
