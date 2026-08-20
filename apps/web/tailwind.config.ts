import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0B8F6A',
          dark: '#075C47',
          light: '#E8F7F2',
        },
        background: '#F7FAF9',
        text: '#17211E',
        muted: '#6B7773',
        success: '#16834B',
        warning: '#D98A00',
        danger: '#D64545',
        border: '#DCE7E3',
      },
    },
  },
  plugins: [],
};
export default config;
