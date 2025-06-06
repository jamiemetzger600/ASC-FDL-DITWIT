/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'media', // Enables dark mode based on system preference
  theme: {
    extend: {
      colors: {
        'fdl-primary': '#1a56db',
        'fdl-secondary': '#6b7280',
        'fdl-accent': '#f59e0b',
        'fdl-success': '#10b981',
        'fdl-warning': '#f59e0b',
        'fdl-error': '#ef4444',
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
} 