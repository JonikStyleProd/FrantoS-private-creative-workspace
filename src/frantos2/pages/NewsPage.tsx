import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useI18n } from '../i18n';
import { go } from '../route';
import { ws } from '../ws/store';
import { GlassPage } from '../glass/Shell';
import { Pane, lgEase } from '../glass/kit';
import { NEWS } from './news';

/** What's new in FrantoS, newest first. Opening the page clears the dot in the header. */
export function NewsPage() {
  const { t, lang } = useI18n();
  useEffect(() => ws.seeNews(NEWS[0]?.n ?? 0), []);
  const fmt = (d: string) => new Date(d).toLocaleDateString(lang, { day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <GlassPage kicker={t("What's new")} title={t('Fresh in FrantoS')} lead={t('What changed lately and where to try it.')} bg="/projects/form-01/form-poster.webp">
      <ol className="grid gap-4 md:grid-cols-2">
        {NEWS.map((n, i) => (
          <motion.li key={n.n} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: lgEase, delay: i * 0.05 }} className={i === 0 ? 'md:col-span-2' : ''}>
            <Pane className={`flex h-full overflow-hidden rounded-[28px] ${i === 0 ? 'flex-col sm:flex-row' : 'flex-col'}`}>
              {n.image && <img src={n.image} alt="" className={`object-cover ${i === 0 ? 'aspect-[4/5] sm:w-[40%] sm:aspect-auto' : 'aspect-[16/9] w-full'}`} />}
              <div className="flex flex-1 flex-col p-6">
                <p className="lg-label">{fmt(n.date)}</p>
                <h2 className={`mt-2 font-extrabold tracking-[-0.03em] ${i === 0 ? 'text-[clamp(26px,3vw,40px)] leading-[1.02]' : 'text-[22px] leading-tight'}`}>{t(n.title)}</h2>
                <p className="mt-3 text-[15px] leading-[1.55] text-white/80">{t(n.body)}</p>
                <button type="button" onClick={() => go(n.path)} className={`lg-btn mt-5 self-start ${i === 0 ? 'lg-btn-primary' : 'lg-btn-ghost'}`}>
                  {t(n.cta)} <ArrowRight size={15} className="rtl:-scale-x-100" />
                </button>
              </div>
            </Pane>
          </motion.li>
        ))}
      </ol>
    </GlassPage>
  );
}
