import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import ruCommon from './locales/ru/common.json';
import ruHeader from './locales/ru/header.json';
import ruAuth from './locales/ru/auth.json';
import ruTasks from './locales/ru/tasks.json';
import ruTeam from './locales/ru/team.json';

import enCommon from './locales/en/common.json';
import enHeader from './locales/en/header.json';
import enAuth from './locales/en/auth.json';
import enTasks from './locales/en/tasks.json';
import enTeam from './locales/en/team.json';

export const SUPPORTED_LANGUAGES = ['ru', 'en'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const STORAGE_KEY = 'mrhelper_lang';

function detectInitialLanguage(): SupportedLanguage {
  try {
    const saved = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (saved === 'ru' || saved === 'en') return saved;
  } catch {
    // localStorage may be unavailable (SSR, privacy mode, test setup order)
  }
  return 'ru';
}

void i18n.use(initReactI18next).init({
  lng: detectInitialLanguage(),
  fallbackLng: 'ru',
  supportedLngs: SUPPORTED_LANGUAGES,
  defaultNS: 'common',
  ns: ['common', 'header', 'auth', 'tasks', 'team'],
  resources: {
    ru: {
      common: ruCommon,
      header: ruHeader,
      auth: ruAuth,
      tasks: ruTasks,
      team: ruTeam,
    },
    en: {
      common: enCommon,
      header: enHeader,
      auth: enAuth,
      tasks: enTasks,
      team: enTeam,
    },
  },
  interpolation: {
    escapeValue: false,
  },
  returnNull: false,
});

i18n.on('languageChanged', (lng) => {
  if (lng !== 'ru' && lng !== 'en') return;
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, lng);
  } catch {
    // persistence is best-effort
  }
});

export default i18n;
