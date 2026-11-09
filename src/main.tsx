import React from 'react';
import ReactDOM from 'react-dom/client';
import { Root } from './frantos2/Root';
import './index.css';
import './frantos2/glass/theme';
import { captureInstall } from './frantos2/glass/install';

captureInstall();

// Android/desktop "Share to FrantoS" lands on /share?title&text&url → keep it for the workspace
if (window.location.pathname === '/share') {
  const q = new URLSearchParams(window.location.search);
  const text = [q.get('title'), q.get('text'), q.get('url')].filter(Boolean).join('\n');
  if (text) sessionStorage.setItem('frantos-share', text);
  window.history.replaceState(null, '', '/#/app');
}

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}

const rootElement = document.getElementById('root');

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <Root />
    </React.StrictMode>
  );
}
