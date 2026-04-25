import { createElement, useEffect } from 'react';
import type React from 'react';
import { I18nextProvider } from 'react-i18next';
import type { Decorator, Preview } from '@storybook/react-vite';

import i18n from '../src/i18n/config';
import '../src/index.css';
import './fonts.css';

// Wrap the decorator body in a component so `useEffect` is called inside a
// React function component (satisfies react-hooks/rules-of-hooks lint).
interface I18nShellProps {
  locale: string;
  children: React.ReactNode;
}
function I18nShell({ locale, children }: I18nShellProps) {
  useEffect(() => {
    if (i18n.language !== locale) {
      void i18n.changeLanguage(locale);
    }
  }, [locale]);
  useEffect(() => {
    document.documentElement.dataset.theme = 'dark';
  }, []);
  return createElement(I18nextProvider, { i18n }, children);
}

const withI18n: Decorator = (Story, context) => {
  const locale = (context.globals.locale as string | undefined) ?? 'ru';
  return createElement(I18nShell, { locale }, createElement(Story));
};

const preview: Preview = {
  decorators: [withI18n],
  globalTypes: {
    locale: {
      description: 'i18n locale',
      defaultValue: 'ru',
      toolbar: {
        title: 'Locale',
        icon: 'globe',
        items: [
          { value: 'ru', title: 'Русский', right: '🇷🇺' },
          { value: 'en', title: 'English', right: '🇬🇧' },
        ],
        dynamicTitle: true,
      },
    },
  },
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'graphite',
      values: [
        { name: 'graphite', value: 'oklch(0.12 0.010 60)' },
        { name: 'surface', value: 'oklch(0.16 0.008 60)' },
        { name: 'elevated', value: 'oklch(0.20 0.007 60)' },
        { name: 'light', value: 'oklch(0.98 0.003 60)' },
      ],
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: 'todo',
    },
    options: {
      storySort: {
        order: [
          'Foundations',
          ['Overview', 'Colors', 'Typography', 'Spacing'],
          'Primitives',
          ['Button', 'TextField', 'Card', 'Badge', 'Avatar', 'Kbd', 'StatusDot', 'IntegrationIcon', 'Dialog'],
          'Patterns',
          'Plan',
        ],
      },
    },
  },
};

export default preview;
