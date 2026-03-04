# Agent Instructions — Idea Matrix

## Project overview

Vanilla JS single-page app. No build step, no framework, no npm. The only server-side code is three Netlify Functions in `netlify/functions/`.

## File map

```
index.html                  — markup and fonts, no inline scripts
style.css                   — all styles
app.js                      — all client-side logic (state, API calls, canvas, UI)
netlify/functions/
  get-ideas.js              — GET ideas by username
  add-idea.js               — POST new idea (validates + rate limits)
  delete-idea.js            — DELETE idea by id+username (rate limits)
  _ratelimit.js             — shared in-memory rate limiter
netlify.toml                — points Netlify to functions directory
.env.example                — template for local env vars
.gitignore                  — excludes .env
```

## Key decisions

- **No Supabase client in the browser.** All DB access goes through Netlify Functions using `SUPABASE_SERVICE_ROLE_KEY` from env. The anon key is not used anywhere.
- **RLS is enabled with no permissive policy.** Direct Supabase access with the anon key returns 401/403. Only the service role key (server-side) works.
- **No authentication.** Username is a plain text name stored in localStorage. Ideas are scoped by username string only.
- **No npm / no bundler.** Do not introduce a package.json, build step, or any dependencies. Keep it file-based.
- **Optimistic UI.** Add and delete update local state and localStorage immediately; server calls happen in background.
- **localStorage cache.** Ideas are cached per username in localStorage and shown instantly on load, then refreshed from server.
- **Mobile layout.** On screens ≤700px, the app switches to a tab-based layout (`#mobile-nav`): one tab for the add/list sidebar, one for the matrix. The `panel-hidden` class (only active inside the media query) toggles visibility. `#main` gets `panel-hidden` on init so only the sidebar shows first.
- **Responsive canvas.** `PAD` (canvas padding) uses JS getters so it returns tighter values when the canvas width is <420px. Dot labels are hidden on narrow canvases — tap a dot to see its details via tooltip.
- **Touch on canvas.** `touchstart` finds the nearest dot within a 16px radius and shows the tooltip above the touch point. Tapping outside the canvas dismisses it.

## Local dev

```bash
netlify dev   # NOT python3 -m http.server — functions won't work without the CLI
```

Requires a `.env` file with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

## What not to do

- Do not add the Supabase JS client back to the browser
- Do not commit `.env` or hardcode keys anywhere
- Do not introduce npm, a bundler, or a framework
- Do not add a permissive RLS policy
- Do not convert `PAD` back to a plain object — it must stay as a getter-based object so canvas padding is responsive
- Do not remove the `main.classList.add('panel-hidden')` init line in the mobile tabs IIFE — without it both panels show on load and the form gets cut off
