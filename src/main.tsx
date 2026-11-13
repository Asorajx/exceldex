import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
/* Self-hosted fonts, Latin characters only and just the weights the design uses. */
import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-500.css';
import '@fontsource/ibm-plex-sans/latin-600.css';
import '@fontsource/ibm-plex-sans/latin-700.css';
import '@fontsource/jetbrains-mono/latin-400.css';
import '@fontsource/jetbrains-mono/latin-500.css';
import './index.css';
import App from './App.tsx';

/* =========================
   App Entry
   ========================= */

/* The page's one entry point: mounts the app into the #root element in index.html. */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
