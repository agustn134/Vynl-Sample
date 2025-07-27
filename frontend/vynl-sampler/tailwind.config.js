/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        'vynl': {
          // Escala de grises minimalista
          'white': '#ffffff',
          'cloud': '#f8f9fa',
          'silver': '#e9ecef',
          'steel': '#dee2e6',
          'slate': '#adb5bd',
          'charcoal': '#6c757d',
          'graphite': '#495057',
          'iron': '#343a40',
          'carbon': '#212529',
          'black': '#000000',
        }
      },
      animation: {
        'pulse-fast': 'pulse 0.2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pad-hit': 'padHit 0.08s ease-out',
        // 'shimmer': 'shimmer 1s linear infinite',
      },
      keyframes: {
        padHit: {
          '0%': { transform: 'scale(1)', boxShadow: '0 0 0 rgba(0, 0, 0, 0)' },
          '50%': { transform: 'scale(0.96)', boxShadow: '0 0 15px rgba(0, 0, 0, 0.4)' },
          '100%': { transform: 'scale(1)', boxShadow: '0 0 0 rgba(0, 0, 0, 0)' }
        },
        // shimmer: {
        //   '0%': { transform: 'translateX(-100%)' },
        //   '100%': { transform: 'translateX(100%)' }
        // }
      }
    },
  },
  plugins: [],
}
