import '@/browser/global.css';
import '../_shared/dashboard.css';
import './regulation-rounds.css';
import { createRoot } from 'react-dom/client';
import { RegulationRoundsPanel } from './App';

createRoot(document.getElementById('root')!).render(<RegulationRoundsPanel />);
