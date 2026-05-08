import '@/browser/global.css';
import '../_shared/dashboard.css';
import { createRoot } from 'react-dom/client';
import { CastUploadPanel } from './App';

createRoot(document.getElementById('root')!).render(<CastUploadPanel />);
