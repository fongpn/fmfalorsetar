/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fef7f0',
          100: '#fdeee0',
          200: '#fad9c1',
          300: '#f6be96',
          400: '#f19969',
          500: '#ed7844',
          600: '#dd6b2c',
          700: '#b85424',
          800: '#934426',
          900: '#773a22',
          950: '#401c10',
        },
      },
    },
  },
  plugins: [],
};
