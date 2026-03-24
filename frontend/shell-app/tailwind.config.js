/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          yellow: '#EAB308',
          yellowDark: '#D97706',
          yellowLight: '#FFFBEB',
          green: '#16A34A',
          greenDark: '#15803D',
          greenLight: '#F0FDF4',
        },
        dark: '#1A1A1A',
        grayText: '#555555',
        lightGray: '#888888',
        borderColor: '#E5E7EB',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'shake': 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shake: {
          '10%, 90%': { transform: 'translate3d(-1px, 0, 0)' },
          '20%, 80%': { transform: 'translate3d(2px, 0, 0)' },
          '30%, 50%, 70%': { transform: 'translate3d(-4px, 0, 0)' },
          '40%, 60%': { transform: 'translate3d(4px, 0, 0)' },
        }
      }
    },
  },
  plugins: [],
}
