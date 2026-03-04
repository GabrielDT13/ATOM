module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#0d7ff2",
        "primary-dark": "#0a66c7",
        accent: "#ffa500",
        secondary: "#f8b84e",
        "surface-dark": "#0a1f44",
        "surface-light": "#f5f7f8",
      },
      fontFamily: {
        display: ["Space Grotesk", "Arial", "sans-serif"],
      },
      keyframes: {
        "auth-float": {
          "0%, 100%": {
            transform: "translateY(0px) rotate(0deg)",
          },
          "50%": {
            transform: "translateY(-20px) rotate(2deg)",
          },
        },
      },
      animation: {
        "auth-float": "auth-float 10s ease-in-out infinite",
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};
