import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App.tsx';
import { registerServiceWorker } from './pwa/register.ts';
import './styles/index.css';

declare global {
  interface Window {
    __crosswordStarted?: boolean;
  }
}

window.__crosswordStarted = true;

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Офлайн-режим только в собранной версии: в режиме разработки SW мешал бы обновлению кода.
if (import.meta.env.PROD) registerServiceWorker();
