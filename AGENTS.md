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
