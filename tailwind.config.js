/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        epic: {
          blue: '#0054a6',
          'blue-light': '#e8f0f9',
          green: '#1a7c2e',
          'green-light': '#e8f5eb',
          red: '#c0392b',
          amber: '#b45309',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['SF Mono', 'Monaco', 'Inconsolata', 'monospace'],
      },
    },
  },
  plugins: [],
}
