# GLB Model Vault

A React application for uploading, managing, and previewing `.glb` 3D models.

## Features

- React dashboard for uploading GLB files.
- Browser database storage using IndexedDB.
- Public catalog/search view for stored models.
- Three.js-powered GLB preview with orbit controls.
- Production build ready for static hosting.

## Local Development

Use the bundled Node runtime in this Codex workspace, or install Node.js locally.

```bash
pnpm install
pnpm run dev
```

Open `http://127.0.0.1:5173`.

## Build

```bash
pnpm run build
```

The production site is emitted to `dist/`.

## Hosting

This project can be hosted as a static React app on Netlify, Vercel, Cloudflare Pages, GitHub Pages, or any static file server.

Recommended Netlify settings:

- Build command: `pnpm run build`
- Publish directory: `dist`

For a shared production database, replace the current IndexedDB adapter in `src/main.jsx` with a hosted database/storage provider such as Supabase, Firebase, or a custom API. IndexedDB is intentionally local to each browser, which keeps this demo self-contained without requiring account credentials.
