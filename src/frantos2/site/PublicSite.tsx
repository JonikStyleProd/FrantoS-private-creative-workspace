import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '../i18n';
import { go } from '../route';
import { hydrate, renderPage } from './render';
import { runMotion } from './motion';
import { loadPublished, PublishedDoc } from './publish';

/** #/w/<slug> — a published page, as its visitors see it. Nothing of the project but this page is loaded. */
export default function PublicSite({ slug }: { slug: string }) {
  const { t } = useI18n();
  const [doc, setDoc] = useState<PublishedDoc | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    loadPublished(slug)
      .then((d) => live && setDoc(d))
      .catch(() => live && setDoc(null));
    return () => void (live = false);
  }, [slug]);
  // published pages ask search engines to stay away
  useEffect(() => {
    const m = document.createElement('meta');
    m.name = 'robots';
    m.content = 'noindex';
    document.head.appendChild(m);
    return () => m.remove();
  }, []);
  useEffect(() => {
    if (doc) document.title = doc.title;
  }, [doc]);
  const out = useMemo(() => (doc ? renderPage(doc, { media: (id) => doc.media[id], mode: 'container', vh: '100vh', motion: 'on' }) : null), [doc]);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !out) return;
    const a = hydrate(el);
    const b = runMotion(el);
    return () => (a(), b());
  }, [out]);
  if (doc === undefined) return <div className="fixed inset-0 bg-[#f3efe7]" aria-busy="true" />;
  if (!doc || !out)
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-[#f3efe7] p-6 text-center text-[#16171a]">
        <p className="text-[22px] font-semibold">{t('This page is not published')}</p>
        <p className="max-w-[420px] text-[15px] text-[#16171a]/70">{t('The address may be wrong, or its author has taken the page down.')}</p>
        <button type="button" onClick={() => go('/')} className="rounded-full border border-[#16171a]/30 px-4 py-2 text-[14px] font-semibold">
          FrantoS
        </button>
      </div>
    );
  return (
    <div className="fixed inset-0 overflow-y-auto" style={{ background: doc.theme.bg }}>
      <div
        style={{ containerType: 'inline-size', containerName: 'fs' }}
        onClick={(e) => {
          // links to unpublished sibling pages go nowhere
          const href = (e.target as HTMLElement).closest('a')?.getAttribute('href');
          if (href && /^[^#?/]+\.html/.test(href)) e.preventDefault();
        }}
      >
        <style>{out.css}</style>
        <div ref={ref} dangerouslySetInnerHTML={{ __html: out.html }} />
      </div>
      <a href="#/" className="fixed bottom-3 end-3 z-10 rounded-full bg-black/55 px-3 py-1.5 text-[11.5px] font-semibold text-white backdrop-blur hover:bg-black/70">
        {t('Made in FrantoS')}
      </a>
    </div>
  );
}
