import type { Preview } from '@storybook/react-vite';

import '../src/index.css';
import './fonts.css';

const preview: Preview = {
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
        ],
      },
    },
  },
};

export default preview;
