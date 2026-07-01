import '@/browser/global.css';
import '../_shared/team-roster.css';
import { createRoot } from 'react-dom/client';
import { TeamRosterGraphic } from '../_shared/TeamRosterGraphic';

createRoot(document.getElementById('root')!).render(<TeamRosterGraphic side="bravo" />);
