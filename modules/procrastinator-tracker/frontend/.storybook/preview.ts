import type { Preview } from '@storybook/react-vite';
import '../src/index.css';

const preview: Preview = {
  tags: ['autodocs'],
  globalTypes: {
    theme: {
      description: 'Home Sweet Home appearance',
      toolbar: {
        title: 'Appearance',
        icon: 'mirror',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'light' },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme === 'dark' ? 'dark' : 'light';
      document.documentElement.dataset.theme = theme;
      document.body.style.backgroundColor = 'var(--hsh-bg)';
      document.body.style.color = 'var(--hsh-ink)';
      return Story();
    },
  ],
};

export default preview;
