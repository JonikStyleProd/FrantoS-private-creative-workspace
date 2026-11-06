import React from 'react';
import { useLanguage } from '../../i18n/LanguageContext';

export const Footer: React.FC = () => {
  const { t } = useLanguage();
  const currentYear = new Date().getFullYear();

  return (
    <footer 
      id="frantos-studio-footer"
      className="w-full mt-auto border-t border-black/8 dark:border-white/10 bg-white/40 dark:bg-[#090d18]/40 backdrop-blur-md text-[#52555F] dark:text-[#A3A099] transition-colors relative z-20 overflow-visible"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 overflow-visible">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-8 text-center md:text-left">
          
          {/* LEFT: JonikStyle Production Logo directly on surface + attribution (vertically centered, 20-24px gap) */}
          <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-5 sm:gap-6">
            <img
              src="/images/js-logo-v1.png"
              alt="JonikStyle Production"
              className="w-[140px] sm:w-[150px] md:w-[175px] h-auto object-contain flex-shrink-0 js-logo-light dark:js-logo-dark select-none"
              loading="lazy"
            />
            <span className="font-display font-medium text-xs sm:text-sm text-[#121316] dark:text-[#F5F3EF] tracking-tight">
              {t.footer.designedBy}
            </span>
          </div>

          {/* RIGHT: Dynamic copyright with current year */}
          <div className="font-mono text-xs text-[#52555F] dark:text-[#A3A099] flex-shrink-0">
            {t.footer.copyright(currentYear)}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
