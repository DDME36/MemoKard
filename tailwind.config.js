/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Noto Sans Thai', 'Inter', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
        thai: ['Noto Sans Thai', 'sans-serif'],
      },
      colors: {
        'soft-blue': '#E3F2FD',
        'mint-green': '#E8F5E9',
        'light-lavender': '#F3E5F5',
        'soft-pink': '#FCE4EC',
        'soft-yellow': '#FFF9C4',
      },
    },
  },
  plugins: [],
}
