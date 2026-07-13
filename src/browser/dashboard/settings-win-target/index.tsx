import '@/browser/global.css';
import '../_shared/dashboard.css';
import './win-target.css';
import { createRoot } from 'react-dom/client';
import { WinTargetPanel } from './App';

createRoot(document.getElementById('root')!).render(<WinTargetPanel />);
