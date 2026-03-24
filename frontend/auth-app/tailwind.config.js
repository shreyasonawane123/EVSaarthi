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
    },
  },
  plugins: [],
}
