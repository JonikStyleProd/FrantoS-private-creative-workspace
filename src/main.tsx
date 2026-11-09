import React from 'react';
import ReactDOM from 'react-dom/client';
import { Root } from './frantos2/Root';
import './index.css';
import './frantos2/glass/theme';
import { captureInstall } from './frantos2/glass/install';

captureInstall();

// "Share to FrantoS" from another app: text arrives as /share?title&text&url; files are caught by the
// service worker (POST) and wait in a cache. Either way the share screen asks where it goes.
if (window.location.pathname === '/share') {
  const q = new URLSearchParams(window.location.search);
  const keep = new URLSearchParams();
  ['title', 'text', 'url', 'files'].forEach((k) => q.get(k) && keep.set(k, q.get(k)!));
  window.history.replaceState(null, '', `/#/share?${keep.toString()}`);
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
