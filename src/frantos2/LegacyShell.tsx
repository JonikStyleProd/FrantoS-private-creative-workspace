import React from 'react';
import { App } from '../App';
import { LanguageProvider } from '../i18n/LanguageContext';

/** FrantoS v1 atelier with its own (en/ru) language context, loaded only when opened. */
// v1 used Google Fonts; load them only when v1 is opened
if (typeof document !== 'undefined' && !document.getElementById('legacy-fonts')) {
  const l = document.createElement('link');
  l.id = 'legacy-fonts';
  l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Syne:wght@500;600;700;800&display=swap';
  document.head.appendChild(l);
}

export function LegacyShell() {
  return (
    <LanguageProvider>
      <App />
    </LanguageProvider>
  );
}
