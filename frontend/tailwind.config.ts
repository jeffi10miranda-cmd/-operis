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
        // Brand corporate colors
        'operis-dark': '#0F3B52',     // Azul petróleo
        'operis-light': '#F8F9FA',    // Branco gelo
        'operis-gray': '#E8E8E8',     // Cinza claro
        'operis-accent': '#1F4B63',   // Azul mais claro
        
        // Semantic colors for status
        'success': '#16a34a',         // Verde
        'warning': '#f59e0b',         // Amarelo/Âmbar
        'danger': '#ef4444',          // Vermelho
        'info': '#3b82f6',            // Azul info
        'secondary': '#7c3aed',       // Roxo
        'tertiary': '#f97316',        // Laranja
      },
      spacing: {
        '128': '32rem',
        '144': '36rem',
      },
      borderRadius: {
        'sm': '2px',
        'md': '4px',
        'lg': '6px',
        'xl': '8px',
      },
      shadows: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        'none': 'none',
      },
      fontFamily: {
        'sans': ['ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        'mono': ['ui-monospace', 'monospace'],
      },

      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
