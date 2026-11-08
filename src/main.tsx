import React from 'react';
import ReactDOM from 'react-dom/client';
import { Root } from './frantos2/Root';
import { LanguageProvider } from './i18n/LanguageContext';
import './index.css';

const rootElement = document.getElementById('root');

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <LanguageProvider>
        <Root />
      </LanguageProvider>
    </React.StrictMode>
  );
}
