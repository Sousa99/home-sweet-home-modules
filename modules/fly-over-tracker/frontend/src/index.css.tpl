@import 'tailwindcss';

@theme {
  --color-primary: {{THEME_PRIMARY}};
  --font-sans:
    {{THEME_FONT_SANS}};
  --animate-closest-card-in: closest-card-in 250ms ease-out;

  @keyframes closest-card-in {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
}

body {
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
}