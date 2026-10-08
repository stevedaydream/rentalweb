/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // === 金黑白主色系 ===
        // 金 (20%) — 主色、active、強調
        "gold": {
          50:  "#FBF7EC",
          100: "#F5E6C0",
          200: "#EDD38A",
          300: "#D3B780",
          400: "#BC9557",
          500: "#9A6F29",  // 按鈕金色兼顧白字對比
          600: "#8E6325",
          700: "#78551F",
          800: "#5C440D",
          900: "#2E2206",
        },
        // 黑 (30%) — 側欄、文字
        "ink": {
          50:  "#F5F4F2",
          100: "#E8E6E1",
          200: "#C8C4BB",
          300: "#A09890",
          400: "#9A8F7F",
          500: "#4A4540",
          600: "#2E2B27",
          700: "#1E1C18",
          800: "#211E19",
          900: "#0A0908",
        },
        // 白 (50%) — 背景、卡片
        "gray": {
          50: "#F7F4EE", 100: "#EEE9DF", 200: "#E2DACD",
          300: "#C5BBAC", 400: "#9A8F7F", 500: "#766D60",
          600: "#5E5549", 700: "#453C2E", 800: "#2C2720",
          900: "#211E19", 950: "#15120E",
        },
        "primary": "#9A6F29",
        "background-light": "#F7F4EE",
        "background-dark":  "#0F0E0B",
        "card-light":       "#FFFCF5",
        "card-dark":        "#1C1A16",
        "surface-light":    "#EEE9DF",
        "surface-dark":     "#252218",
        // 語意色（沿用，保持功能色不變）
        "text-primary-light":   "#1C1A16",
        "text-primary-dark":    "#F5F4F2",
        "text-secondary-light": "#766D60",
        "text-secondary-dark":  "#B6AC9D",
      },
      fontFamily: {
        "display": ["Plus Jakarta Sans", "Noto Sans TC", "sans-serif"],
        "serif": ["Noto Serif TC", "serif"]
      },
    },
  },
  plugins: [],
}
