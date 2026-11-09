import React from 'react';
import { LANGS, useI18n } from './index';

export function LangSwitch({ dark }: { dark?: boolean }) {
  const { lang, setLang, t } = useI18n();
  return (
    <div className="flex items-center rounded-full border p-0.5" style={{ borderColor: dark ? 'var(--line)' : 'var(--rule)' }} role="radiogroup" aria-label={t('Language')}>
      {LANGS.map((l) => (
        <button
          key={l.id}
          role="radio"
          aria-checked={lang === l.id}
          aria-label={l.name}
          onClick={() => setLang(l.id)}
          className="rounded-full px-2 py-1 text-[11.5px] font-semibold"
          style={{ background: lang === l.id ? (dark ? '#f3efe7' : 'var(--ink)') : 'transparent', color: lang === l.id ? (dark ? 'var(--ink)' : 'var(--paper)') : dark ? 'var(--fog)' : 'var(--ink-2)' }}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

