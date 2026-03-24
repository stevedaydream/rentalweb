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
          300: "#E2BE5A",
          400: "#D4A83A",
          500: "#C9A84C",  // 主金色
          600: "#B8963E",
          700: "#8B6914",
          800: "#5C440D",
          900: "#2E2206",
        },
        // 黑 (30%) — 側欄、文字
        "ink": {
          50:  "#F5F4F2",
          100: "#E8E6E1",
          200: "#C8C4BB",
          300: "#A09890",
          400: "#706860",
          500: "#4A4540",
          600: "#2E2B27",
          700: "#1E1C18",
          800: "#141210",
          900: "#0A0908",
        },
        // 白 (50%) — 背景、卡片
        "background-light": "#FAFAF8",
        "background-dark":  "#0F0E0B",
        "card-light":       "#FFFFFF",
        "card-dark":        "#1C1A16",
        "surface-light":    "#F3F1EC",
        "surface-dark":     "#252218",
        // 語意色（沿用，保持功能色不變）
        "text-primary-light":   "#1C1A16",
        "text-primary-dark":    "#F5F4F2",
        "text-secondary-light": "#706860",
        "text-secondary-dark":  "#A09890",
      },
      fontFamily: {
        "display": ["Plus Jakarta Sans", "Inter", "sans-serif"]
      },
    },
  },
  plugins: [],
}
