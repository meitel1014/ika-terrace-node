import '@/browser/global.css';
import '../_shared/dashboard.css';
import './stage-banpick.css';
import { createRoot } from 'react-dom/client';
import { StageBanpickPanel } from './App';

createRoot(document.getElementById('root')!).render(<StageBanpickPanel />);
