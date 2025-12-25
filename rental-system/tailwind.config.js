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
        // 提取自你提供的 UI 代碼 
        "primary": "#0d65f2",
        "background-light": "#f5f7f8",
        "background-dark": "#101722",
        "card-light": "#f0f2f5",
        "card-dark": "#1e293b",
        "text-primary-light": "#1c1c1e",
        "text-primary-dark": "#f8fafc",
      },
      fontFamily: {
        "display": ["Plus Jakarta Sans", "Inter", "sans-serif"]
      },
    },
  },
  plugins: [],
}