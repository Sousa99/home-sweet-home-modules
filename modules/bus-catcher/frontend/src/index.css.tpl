@import 'tailwindcss';

@theme {
  --color-primary: {{THEME_PRIMARY}};
  --font-sans:
    {{THEME_FONT_SANS}};
}

body {
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
}