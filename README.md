# ironbank-server

Serverless AI API for IronBank (Vercel-ready)

## What this does
- Provides an authenticated server-side endpoint `/api/ai` that calls OpenAI securely (your `OPENAI_API_KEY` stays on the server).
- Optionally logs prompts & replies into Supabase (`ai_logs` table) using `SUPABASE_SERVICE_ROLE_KEY`.

## Files
- `api/ai.js` — main serverless function.
- `package.json` — dependencies and scripts.
- `.env.example` — environment variables template.

## Setup (Vercel)
1. Create a new Vercel project and upload this repository.
2. In Project Settings → Environment Variables add:
   - `OPENAI_API_KEY` = your OpenAI secret key (sk-...)
   - `SUPABASE_URL` = your Supabase URL
   - `SUPABASE_SERVICE_ROLE_KEY` = Supabase Service Role key (keeps logs writable from server)
   - `MODEL` = optional, defaults to `gpt-5` (use `gpt-4o-mini` to save cost)
3. Deploy. The function will be available at:
   `https://<your-vercel-domain>/api/ai`

## Supabase table (example SQL)
Run this in your Supabase SQL editor to create the `ai_logs` table:

```sql
create table if not exists ai_logs (
  id bigint generated always as identity primary key,
  "user" text,
  prompt text,
  reply text,
  model text,
  meta jsonb,
  created_at timestamp with time zone default now()
);
```

## Security notes
- Do **not** put `OPENAI_API_KEY` in client-side code.
- Use `SUPABASE_SERVICE_ROLE_KEY` on the server only.
- Consider adding an auth token header for requests coming from your Strikingly site.

## Deployment tips
- If you want request authentication, add a `X-IRONBANK-SERVER-TOKEN` header check in `api/ai.js` and set the secret in Vercel.
