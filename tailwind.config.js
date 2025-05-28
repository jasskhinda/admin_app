/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: "hsl(var(--primary))",
        secondary: "hsl(var(--secondary))",
        surface: "hsl(var(--surface))",
        onPrimary: "hsl(var(--on-primary))",
        onSecondary: "hsl(var(--on-secondary))",
        disabled: "hsl(var(--disabled))",
        // Brand colors (aliases for consistency)
        brand: {
          background: "hsl(var(--brand-background))",
          surface: "hsl(var(--brand-surface))",
          text: "hsl(var(--brand-text))",
          accent: "hsl(var(--brand-accent))",
          buttonText: "hsl(var(--brand-button-text))",
          card: "hsl(var(--brand-card))",
          border: "hsl(var(--brand-border))",
          // Status colors
          pending: "hsl(var(--brand-pending))",
          upcoming: "hsl(var(--brand-upcoming))",
          inProgress: "hsl(var(--brand-in-progress))",
          completed: "hsl(var(--brand-completed))",
          cancelled: "hsl(var(--brand-cancelled))",
        },
      },
    },
  },
  plugins: [],
};