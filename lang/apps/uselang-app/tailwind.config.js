/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#1a1510",
          50: "#f7f5f2",
          100: "#ece8e1",
          200: "#d6cfc3",
          300: "#bbb09e",
          400: "#9f8f79",
          500: "#8a7a64",
          600: "#6b5e4c",
          700: "#4d4336",
          800: "#322b22",
          900: "#1a1510",
        },
        gold: {
          DEFAULT: "#c9a97a",
          50: "#fdf9f4",
          100: "#f8f0e4",
          200: "#f0dfc4",
          300: "#e5c99d",
          400: "#d4ad7a",
          500: "#c9a97a",
          600: "#b08b56",
          700: "#8d6d3f",
          800: "#6a512e",
          900: "#47361e",
        },
        cream: {
          DEFAULT: "#FAFAF8",
          50: "#FFFFFF",
          100: "#FAFAF8",
          200: "#F5F3EF",
        },
        accent: {
          DEFAULT: "#007AFF",
          light: "#4DA3FF",
          dark: "#0055CC",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
