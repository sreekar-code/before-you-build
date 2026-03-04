# Idea Matrix

Evaluate ideas before you build them. Plot ideas on an effort × impact matrix to quickly see what's worth doing.

## What it does

- Enter your name to get a personal idea space
- Add ideas with effort (0–5) and impact (0–5) scores
- Ideas are placed on a canvas split into four quadrants: **Do It**, **Plan It**, **Maybe**, **Skip**
- Hover over dots to see idea details
- Export your ideas as JSON

## Architecture

```
Browser → /.netlify/functions/* → Supabase (service_role key, server-side only)
```

All database access goes through Netlify Functions. The Supabase service role key never reaches the browser. RLS is enabled with no permissive policies, so direct access with the anon key is fully blocked.

## Stack

- Vanilla JS + Canvas API (no frontend framework)
- Supabase (Postgres + RLS)
- Netlify Functions (serverless, Node.js)

## Local development

1. Install the Netlify CLI: `npm install -g netlify-cli`
2. Copy `.env.example` to `.env` and fill in your values
3. Run `netlify dev`

The CLI injects env vars from `.env` and proxies function calls locally.

## Environment variables

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (Settings → API → Secret keys) |

Set these in Netlify dashboard → Site settings → Environment variables for production.

## Supabase setup

Run this in the Supabase SQL editor:

```sql
CREATE TABLE ideas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  username text NOT NULL,
  name text NOT NULL,
  effort integer NOT NULL CHECK (effort BETWEEN 0 AND 5),
  impact integer NOT NULL CHECK (impact BETWEEN 0 AND 5),
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;
-- No permissive policy — anon key is fully blocked.
-- Service role key (used by functions) bypasses RLS.
```

## Deployment

1. Push repo to GitHub
2. Connect repo to Netlify
3. Add environment variables in Netlify dashboard
4. Deploy — Netlify auto-deploys on every push to `main`

## API

| Function | Method | Description |
|---|---|---|
| `get-ideas` | GET `?username=X` | Fetch ideas for a user |
| `add-idea` | POST | Add a new idea |
| `delete-idea` | DELETE | Delete an idea (scoped to username) |

Rate limits: 15 adds/min, 30 deletes/min per IP.
