import '@/browser/global.css';
import '../_shared/cast.css';
import './cast.css';
import { createRoot } from 'react-dom/client';
import { CastGraphic } from '../_shared/CastGraphic';

createRoot(document.getElementById('root')!).render(
  <CastGraphic layoutClass="cast-layout--main" />
);
