/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // WAGO Brand Colors
        wago: {
          orange: '#FF6600',
          'orange-dark': '#CC5200',
          'orange-light': '#FF8533',
        },
        // Panel/UI Colors (dark theme)
        panel: {
          bg: '#1e1e1e',
          'bg-secondary': '#252526',
          border: '#3c3c3c',
          hover: '#2a2d2e',
          active: '#37373d',
          text: '#cccccc',
          'text-muted': '#858585',
        },
        // Menu/Header Colors
        menu: {
          bg: '#3c3c3c',
          hover: '#505050',
          active: '#094771',
          border: '#454545',
        },
        // LED Indicator Colors
        led: {
          off: '#4a4a4a',
          'off-border': '#333333',
          green: '#22c55e',
          'green-glow': 'rgba(34, 197, 94, 0.5)',
          red: '#ef4444',
          'red-glow': 'rgba(239, 68, 68, 0.5)',
          yellow: '#eab308',
          'yellow-glow': 'rgba(234, 179, 8, 0.5)',
          blue: '#3b82f6',
          'blue-glow': 'rgba(59, 130, 246, 0.5)',
        },
        // Status Colors
        status: {
          success: '#22c55e',
          warning: '#eab308',
          error: '#ef4444',
          info: '#3b82f6',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      fontSize: {
        xxs: ['0.625rem', { lineHeight: '0.875rem' }],
      },
      spacing: {
        // Common panel sizes
        'panel-sm': '200px',
        'panel-md': '280px',
        'panel-lg': '360px',
        toolbar: '40px',
        menubar: '30px',
        statusbar: '24px',
      },
      animation: {
        'led-blink': 'led-blink 0.5s ease-in-out infinite',
        'led-blink-slow': 'led-blink 1s ease-in-out infinite',
        'pulse-subtle': 'pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in-right': 'slide-in-right 0.2s ease-out',
        'slide-in-left': 'slide-in-left 0.2s ease-out',
        'fade-in': 'fade-in 0.15s ease-out',
        'scale-in': 'scale-in 0.15s ease-out',
      },
      keyframes: {
        'led-blink': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-in-left': {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      boxShadow: {
        'led-green': '0 0 6px 2px rgba(34, 197, 94, 0.5)',
        'led-red': '0 0 6px 2px rgba(239, 68, 68, 0.5)',
        'led-yellow': '0 0 6px 2px rgba(234, 179, 8, 0.5)',
        'led-blue': '0 0 6px 2px rgba(59, 130, 246, 0.5)',
        panel: '0 2px 8px rgba(0, 0, 0, 0.3)',
        'panel-lg': '0 4px 16px rgba(0, 0, 0, 0.4)',
      },
      borderRadius: {
        sm: '2px',
      },
    },
  },
  plugins: [],
};
