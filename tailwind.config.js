/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        frantos: {
          bg: {
            dark: '#090B0E',
            'dark-elevated': '#11141A',
            'dark-surface': '#181C24',
            light: '#F8F7F4',
            'light-elevated': '#FFFFFF',
            'light-surface': '#EFECE6',
          },
          border: {
            dark: 'rgba(255, 255, 255, 0.08)',
            'dark-strong': 'rgba(255, 255, 255, 0.16)',
            light: 'rgba(0, 0, 0, 0.07)',
            'light-strong': 'rgba(0, 0, 0, 0.15)',
          },
          text: {
            'dark-primary': '#F3F1EC',
            'dark-secondary': '#A0A6B2',
            'dark-muted': '#6B7280',
            'light-primary': '#111317',
            'light-secondary': '#4A505C',
            'light-muted': '#888E99',
          },
          accent: {
            motion: '#F43F5E',
            '3d': '#06B6D4',
            brand: '#386BF6',
            ultramarine: '#386BF6',
            ui: '#8B5CF6',
            web: '#10B981',
            sound: '#F97316',
          },
        },
        ultramarine: {
          DEFAULT: '#386BF6',
          hover: '#2554E8',
          subtle: 'rgba(56, 107, 246, 0.12)',
          dark: '#1D4ED8',
          light: '#2563EB',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        display: ['"Syne"', 'sans-serif'],
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glass-dark': '0 8px 32px 0 rgba(0, 0, 0, 0.37), inset 0 1px 0 0 rgba(255, 255, 255, 0.08)',
        'glass-light': '0 8px 32px 0 rgba(0, 0, 0, 0.05), inset 0 1px 0 0 rgba(255, 255, 255, 0.8)',
        'specular-dark': '0 0 25px rgba(255, 255, 255, 0.04)',
        'float-dark': '0 20px 40px -15px rgba(0,0,0,0.7)',
        'float-light': '0 20px 40px -15px rgba(0,0,0,0.08)',
      },
      animation: {
        'pulse-subtle': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float-slow': 'floatSlow 8s ease-in-out infinite',
      },
      keyframes: {
        floatSlow: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
    },
  },
  plugins: [],
};
