# skillsync — web

Marketing site and docs for skillsync. Built with Next.js 16, React 19, Tailwind CSS 4, and TypeScript.

## Fonts

| Font | Role |
|------|------|
| Inter | Body text |
| Fraunces | Display headings |
| IBM Plex Mono | Code blocks |

## Commands

```bash
npm run dev    # start dev server at localhost:3000
npm run build  # production build
npm run lint   # run eslint
```

## Structure

```
app/
  layout.tsx       # root layout — fonts, metadata, global CSS
  page.tsx         # landing page
  docs/page.tsx    # docs page
  components/      # shared UI components
  globals.css      # Tailwind directives + custom styles
```
