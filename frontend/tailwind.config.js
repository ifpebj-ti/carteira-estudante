/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./views/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)"],
      },
      colors: {
        primary: {
          50: "#f0fdf4",   // Fundo muito claro (hover em elementos claros)
          100: "#dcfce7",  // Fundo claro (tags ou badges)
          500: "#22c55e",  // Verde base
          600: "#16a34a",  // Verde principal (botões e destaques)
          700: "#15803d",  // Verde escuro (hover de botões)
          800: "#166534",  // Verde muito escuro (bordas)
          900: "#14532d",  // Verde institucional profundo (sidebar e cabeçalhos escuros)
        },
      },
    },
  },
  plugins: [],
};