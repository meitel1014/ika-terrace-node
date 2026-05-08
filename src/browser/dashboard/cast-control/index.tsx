import '@/browser/global.css';
import '../_shared/dashboard.css';
import './cast-control.css';
import { createRoot } from 'react-dom/client';
import { CastControlPanel } from './App';

createRoot(document.getElementById('root')!).render(<CastControlPanel />);
