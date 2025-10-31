/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Bio-tech inspired color palette
        nano: {
          cyan: {
            50: '#e0f7ff',
            100: '#b3ebff',
            200: '#80dfff',
            300: '#4dd3ff',
            400: '#1ac7ff',
            500: '#00b8e6',
            600: '#0090b3',
            700: '#006880',
            800: '#00404d',
            900: '#00181a',
          },
          emerald: {
            50: '#e6fff5',
            100: '#b3ffe6',
            200: '#80ffd6',
            300: '#4dffc7',
            400: '#1affb8',
            500: '#00e6a0',
            600: '#00b37d',
            700: '#00805a',
            800: '#004d37',
            900: '#001a14',
          },
          purple: {
            50: '#f3e6ff',
            100: '#dab3ff',
            200: '#c180ff',
            300: '#a84dff',
            400: '#8f1aff',
            500: '#7600e6',
            600: '#5c00b3',
            700: '#420080',
            800: '#28004d',
            900: '#0e001a',
          },
          amber: {
            50: '#fff8e0',
            100: '#ffecb3',
            200: '#ffe080',
            300: '#ffd44d',
            400: '#ffc81a',
            500: '#e6ae00',
            600: '#b38700',
            700: '#806000',
            800: '#4d3900',
            900: '#1a1300',
          },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      boxShadow: {
        'glow-cyan': '0 0 20px rgba(0, 184, 230, 0.5)',
        'glow-emerald': '0 0 20px rgba(0, 230, 160, 0.5)',
        'glow-purple': '0 0 20px rgba(118, 0, 230, 0.5)',
        'glow-amber': '0 0 20px rgba(230, 174, 0, 0.5)',
      },
    },
  },
  plugins: [],
}
