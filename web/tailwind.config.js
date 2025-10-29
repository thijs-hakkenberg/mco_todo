/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{svelte,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'priority-urgent': '#ef4444',
        'priority-high': '#f97316',
        'priority-medium': '#eab308',
        'priority-low': '#22c55e',
      }
    },
  },
  plugins: [],
}