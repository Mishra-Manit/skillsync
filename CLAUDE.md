# skillsync marketing site

Next.js 16 + React 19 + Tailwind CSS 4 marketing site and docs.

## Commands

```bash
npm run dev    # local dev server
npm run build  # production build
npm run lint   # eslint
```

## Next.js 16 -- Read the Docs First

This version has breaking changes -- APIs, conventions, and file structure may differ from your training data. Before writing any frontend code, read the relevant guide in `node_modules/next/dist/docs/` and heed deprecation notices.

## Stack

- **Next.js 16** (App Router only -- no `pages/` directory)
- **React 19** with Server Components by default
- **Tailwind CSS 4** via `@tailwindcss/postcss`
- **TypeScript** strict mode
- Fonts: Inter (body), Fraunces (display), IBM Plex Mono (code)

## Structure

```
app/
  layout.tsx        # root layout -- fonts, metadata, global CSS
  page.tsx          # landing page
  docs/page.tsx     # docs page
  components/       # shared UI components
  globals.css       # Tailwind directives + custom styles
next.config.ts      # turbopack config
```

## Code Style

- Server Components by default; add `"use client"` only when you need browser APIs, hooks, or event handlers
- Tailwind utility classes for all styling -- no CSS modules, no styled-components
- Components are pure functions; no class components
- Keep components under 150 lines; extract sub-components when they grow
- Use semantic HTML (`<section>`, `<nav>`, `<article>`, etc.)
- All images use `next/image`; all links use `next/link`
- No `console.log` in shipped code
- Prefer composition over prop drilling -- use React context sparingly
