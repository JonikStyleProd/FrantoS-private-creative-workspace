import React, { useMemo, useState } from 'react';
import { Check, Copy, Download, Braces } from 'lucide-react';
import { useI18n } from '../i18n';
import { useWs } from '../ws/store';
import { toast } from '../ws/kit';
import { Pane } from '../glass/kit';
import { DEFAULT_BRAND } from '../studio/brand';
import { projectPalette } from '../studio/palette';
import { toCss, toJson, toTailwind, tokensOf } from './tokens';

const TABS = [
  { id: 'css', label: 'CSS variables', file: 'tokens.css' },
  { id: 'tw', label: 'Tailwind', file: 'tailwind.tokens.js' },
  { id: 'json', label: 'JSON', file: 'tokens.json' },
] as const;

/** The brand kit as code: copy it or download the file. Updates as the brand kit changes. */
export function TokensPanel() {
  const { t } = useI18n();
  const { state } = useWs();
  const brand = { ...DEFAULT_BRAND, ...state.brand };
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('css');
  const [copied, setCopied] = useState(false);
  const fallback = useMemo(() => state.projects.flatMap((p) => projectPalette(p)), [state.projects]);
  const tokens = tokensOf(brand, fallback);
  const code = tab === 'css' ? toCss(tokens, brand.name) : tab === 'tw' ? toTailwind(tokens, brand.name) : toJson(tokens);
  const file = TABS.find((x) => x.id === tab)!.file;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      toast(t('The browser did not allow copying. Select the text and copy it.'), { tone: 'error' });
    }
  };
  const download = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([code], { type: 'text/plain' }));
    a.download = file;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  return (
    <Pane id="tokens" className="space-y-3 rounded-[28px] p-5">
      <h2 className="flex items-center gap-2 text-[18px] font-extrabold">
        <Braces size={18} /> {t('Design tokens')}
      </h2>
      <p className="text-[13px] leading-[1.5] text-white/70">{t('Your brand kit as code for developers: colours, type, radii and spacing. It follows every change to the brand kit.')}</p>
      <div className="flex flex-wrap items-center gap-1" role="tablist" aria-label={t('Format')}>
        {TABS.map((x) => (
          <button key={x.id} type="button" role="tab" aria-selected={tab === x.id} onClick={() => setTab(x.id)} className={`min-h-[34px] whitespace-nowrap rounded-full px-3 text-[12.5px] font-bold ${tab === x.id ? 'bg-white text-[#11151a]' : 'lg-soft hover:bg-white/15'}`}>
            {t(x.label)}
          </button>
        ))}
        <span className="ms-auto flex gap-1">
          <button type="button" onClick={copy} className="lg-btn lg-btn-ghost min-h-[34px] text-[12.5px]">
            {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? t('Copied') : t('Copy')}
          </button>
          <button type="button" onClick={download} className="lg-btn lg-btn-ghost lg-icon min-h-[34px]" aria-label={t('Download {name}', { name: file })} title={file}>
            <Download size={14} />
          </button>
        </span>
      </div>
      <pre dir="ltr" className="lg-scroll max-h-[300px] overflow-auto rounded-[16px] p-4 text-[12px] leading-[1.6]" style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", background: '#12151a', color: '#e6e9ee' }}>
        {code}
      </pre>
      {Object.keys(tokens.colors).length === 0 && <p className="text-[12.5px] text-white/60">{t('Add brand colours above and they appear here.')}</p>}
    </Pane>
  );
}
