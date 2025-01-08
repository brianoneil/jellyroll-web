/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      keyframes: {
        'fold-in': {
          '0%': { 
            opacity: '0',
            transform: 'perspective(1000px) rotateX(90deg)',
            transformOrigin: 'top'
          },
          '50%': {
            opacity: '0.8'
          },
          '100%': { 
            opacity: '1',
            transform: 'perspective(1000px) rotateX(0deg)',
            transformOrigin: 'top'
          }
        },
        'fold-out': {
          '0%': {
            opacity: '1',
            transform: 'perspective(1000px) rotateX(0deg)',
            transformOrigin: 'top'
          },
          '50%': {
            opacity: '0.8'
          },
          '100%': {
            opacity: '0',
            transform: 'perspective(1000px) rotateX(90deg)',
            transformOrigin: 'top'
          }
        }
      },
      animation: {
        'fold-in': 'fold-in 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'fold-out': 'fold-out 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards'
      }
    },
  },
  plugins: [],
}; 