/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        'vynl': {
          'black': '#000000',
          'dark': '#1a1a1a',
          'purple': '#9d4edd',
          'purple-dark': '#5a189a',
          'gray': '#333333',
          'gray-light': '#666666'
        }
      },
      gridTemplateColumns: {
        '16': 'repeat(16, minmax(0, 1fr))',
        '4': 'repeat(4, minmax(0, 1fr))',
      },
      animation: {
        'pulse-fast': 'pulse 0.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pad-hit': 'padHit 0.15s ease-out',
      },
      keyframes: {
        padHit: {
          '0%': { transform: 'scale(1)', boxShadow: '0 0 0 rgba(157, 74, 237, 0)' },
          '50%': { transform: 'scale(0.95)', boxShadow: '0 0 20px rgba(157, 74, 237, 0.6)' },
          '100%': { transform: 'scale(1)', boxShadow: '0 0 0 rgba(157, 74, 237, 0)' }
        }
      }
    },
  },
  plugins: [],
}
