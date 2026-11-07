import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App.tsx';
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
