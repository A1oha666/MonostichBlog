# personal-site

Personal site homepage (tech blog / backend engineering theme). Built with **Astro**.

- **Theme**: orange accent, dark & light modes with a toggle in the nav (remembers choice in `localStorage`, respects `prefers-color-scheme`)
- **Type**: Fraunces (serif) + JetBrains Mono — self-hosted via `@fontsource`, no Google Fonts CDN. Chinese falls back to system STZhongsong (华文中宋).
- **Vibe**: "code flavor" — terminal-prompt hero, code-comment section dividers, backtick tags, a Go snippet in a window chrome
- **Language**: English-first copy; replace placeholders in `src/data/`

## Run

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # output to ./dist
npm run preview
```

## Structure

```
src/
  layouts/BaseLayout.astro   # fonts (@fontsource) + global.css import + theme init script
  components/
    Nav.astro                # sticky nav + theme toggle (SVG sun/moon)
    Terminal.astro           # terminal-prompt hero window
    CodeWindow.astro         # code block with window chrome (Go snippet)
    Hero / About / Posts / Projects / SiteFooter
  data/
    posts.js projects.js     # placeholder content
  styles/global.css          # design tokens (orange, dark + light themes)
  pages/index.astro
```

## Replace placeholder content

- Posts: `src/data/posts.js`
- Projects: `src/data/projects.js`
- Name / tagline / about: top of each component `.astro`
- Colors: tokens in `src/styles/global.css` (`--accent` etc., dark & light blocks)
