import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../../../common/i18n/config';
import './LanguageSwitcher.css';

function isSupported(lang: string | undefined): lang is SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage);
}

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation('header');
  const raw = i18n.resolvedLanguage ?? i18n.language;
  const currentLang: SupportedLanguage = isSupported(raw) ? raw : 'ru';

  return (
    <div className="language-switcher" role="group" aria-label={t('language.switchTo')}>
      {SUPPORTED_LANGUAGES.map((lang) => {
        const isActive = currentLang === lang;
        return (
          <button
            key={lang}
            type="button"
            className={
              isActive
                ? 'language-switcher__btn language-switcher__btn--active'
                : 'language-switcher__btn'
            }
            aria-pressed={isActive}
            onClick={() => void i18n.changeLanguage(lang)}
          >
            {lang.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
