# Ru-Bric Video Creator

A Progressive Web App (PWA) for Ru-Bric Plumbing to create social media reels, videos, and ads.

## Features

- **Multi-clip video assembly** — Upload multiple videos, pick the best moments, arrange on a timeline
- **In-app recording** — Record directly from your phone's camera
- **10 templates** — 5 organic (Before/After, Quick Tip, Promo, Team Spotlight, Testimonial) + 5 ad templates
- **Ad creation mode** — CTAs, contact info bars, pricing callouts, urgency elements
- **Text overlays** — Drag-to-position, custom fonts, colors, animations
- **Filters** — 8 presets (Warm, Cool, B&W, Vivid, etc.)
- **Background music** — Bundled royalty-free tracks
- **Branding** — Ru-Bric logo auto-applied to all videos
- **Multi-platform export** — YouTube Shorts, Instagram Reels, TikTok, Facebook, plus ad formats
- **PWA** — Installable on phones, works offline

## Tech Stack

- **Client**: React 18 + Vite + TypeScript + Tailwind CSS + Zustand
- **Server**: Express + TypeScript + SQLite (better-sqlite3 + drizzle-orm)
- **Video**: Canvas API (preview) + FFmpeg (server-side export)

## Quick Start

```bash
npm install
npm run dev
```

This starts both the client (http://localhost:5173) and server (http://localhost:3000).

**Default login:**
- Name: `Boss`
- PIN: `1234`

## Project Structure

```
client/     — React PWA (Vite)
server/     — Express API + SQLite
shared/     — Shared types & format presets
```
