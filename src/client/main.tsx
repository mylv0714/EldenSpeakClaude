import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { initPlatform } from './platform';
import { setScreen } from './state/ui';
import { App } from './ui/App';
import './styles.css';

async function boot() {
  await initPlatform();
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  // Fonts are used on canvas too (road signs, bubbles): wait briefly so the first frames use them.
  await Promise.race([document.fonts?.ready, new Promise((r) => setTimeout(r, 1500))]);
  setScreen('title');
}

void boot();
