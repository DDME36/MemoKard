/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        'xs': '375px', // Extra small devices (small phones)
      },
      fontFamily: {
        sans: ['IBM Plex Sans Thai', 'Outfit', 'sans-serif'],
        outfit: ['Outfit', 'sans-serif'],
        thai: ['IBM Plex Sans Thai', 'sans-serif'],
        caveat: ['Caveat', 'cursive'],
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
