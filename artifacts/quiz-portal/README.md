# Inside FUTA — Smart Test Portal

A 25-minute, 30-question quiz portal with a candidate flow, results screen with corrections, WhatsApp report sharing, and an admin dashboard. Backed by Supabase.

## Local development

```bash
npm install
npm run dev
```

## Deploying to Netlify

This folder is self-contained — you can zip everything inside `artifacts/quiz-portal/` (excluding `node_modules` and `dist`) and either:

1. **Drag-and-drop deploy** — run `npm run build` locally, then drag the generated `dist/` folder onto https://app.netlify.com/drop.
2. **Git deploy** — push the folder contents to a new repo and connect it to Netlify. The included `netlify.toml` already sets:
   - Build command: `npm install && npm run build`
   - Publish directory: `dist`
   - Node version: 20
   - SPA fallback redirect to `index.html`

## Admin login

Enter the admin name (`ISRAEL MARVELOUS ADEBISI`) with school `SPS` to open the master control panel — no access code required.

## Configuration

All quiz config (access code, timer, question bank, schools/departments, admin identity, WhatsApp number) lives in `src/quiz-data.ts`. Edit there and rebuild.

Supabase URL and anon key are set in `src/App.tsx`.
