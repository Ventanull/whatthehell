/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f4ff',
          100: '#e0e8ff',
          500: '#3B82F6', // Blue like the screenshot
          600: '#2563EB',
          700: '#1D4ED8',
          900: '#1e1b4b', // Deep purple
        }
      }
    },
  },
  plugins: [],
}
