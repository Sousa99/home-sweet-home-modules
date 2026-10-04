import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs'],
  async viteFinal(config) {
    const { default: tailwindcss } = await import('@tailwindcss/vite');
    config.plugins ??= [];
    config.plugins.push(tailwindcss());
    return config;
  },
};

export default config;
