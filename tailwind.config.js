/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      gridTemplateColumns: {
        '14': 'repeat(14, minmax(0, 1fr))',
      },
      colors: {
        primary: {
          50: '#F0F0F0',
          100: '#D1D1D1',
          200: '#A1A1A1',
          300: '#6B6B6B',
          400: '#4D4D4D',
          500: '#3C3C3C',
          600: '#2E2E2E',
          700: '#242424',
          800: '#1A1A1A',
          900: '#121212',
        },
        green: {
          50: '#EDFCF6',
          100: '#D3FAEB',
          200: '#A0F3D0',
          300: '#5EE0AC',
          400: '#1FDD92',
          500: '#00C47A',
          600: '#00A369',
          700: '#007E5A',
          800: '#005C42',
          900: '#003F2F',
        },
        blue: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
        }
      }
    },
  },
  plugins: [],
}

