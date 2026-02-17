/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Connected to app/layout.tsx variable
        pixel: ['var(--font-pixel)', 'cursive'], 
      },
      colors: {
        retro: {
          purple: '#2e2157',
          gold: '#ffd700',
          green: '#39ff14',
          black: '#000000',
        }
      },
      boxShadow: {
        pixel: '4px 4px 0px 0px #000000',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}