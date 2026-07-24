# Nutrition Quest — Supabase leaderboard deployment

The game remains fully playable offline. Global rankings activate after this backend is deployed.

## 1. Create and configure Supabase

1. Create a Supabase project.
2. In **Authentication → Providers**, enable **Anonymous Sign-Ins**.
3. Open the SQL Editor and run `schema.sql`.
4. Install the Supabase CLI and log in on a development machine (this is only for backend deployment; the game itself still uses no npm or libraries).
5. Link the folder to your project and deploy:

```sh
supabase functions deploy sync-profile
supabase functions deploy start-run
supabase functions deploy checkpoint
supabase functions deploy finish-run
```

Supabase automatically supplies `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to Edge Functions. Never expose the service-role key in the game.

## 2. Connect the static game

Open `leaderboard-config.js` and enter the project's public URL and **anon/publishable** key. These two values are intended for browser use. Do not enter an admin or service-role key.

```js
window.NQ_ONLINE = {
  url: 'https://YOUR_PROJECT.supabase.co',
  anonKey: 'YOUR_PUBLIC_ANON_OR_PUBLISHABLE_KEY'
};
```

Deploy all game files to the same static host. Opening `index.html` directly remains supported, although some browsers apply stricter network policies to `file://`; Live Server or published HTTPS hosting is recommended for online rankings.

## Security model

- Every browser creates an anonymous Supabase Auth account and receives a JWT.
- Profile ownership is tied to `auth.uid()`.
- The service-role credential exists only inside Edge Functions.
- The server issues a unique run session and nonce.
- Checkpoints verify elapsed wall time, monotonic score, and plausible score rate.
- Final submissions verify elapsed time, checkpoint coverage, level, kills, score, and the ten-minute boss schedule.
- Session IDs are single-use; the database rejects duplicate submissions.
- Only validated Edge Function submissions can write leaderboard runs.

A completely offline run cannot later be proven authentic because it never received a server-issued session. Runs that start online and temporarily lose connectivity are queued locally and retried after reconnection. This is an intentional security boundary: accepting unsigned offline results would allow fabricated scores.

## Production hardening recommendations

- Add Supabase CAPTCHA/Turnstile to anonymous registration.
- Set Edge Function rate limits at the gateway.
- Tighten score and level envelopes after collecting legitimate gameplay telemetry.
- Add signed build-version and balance-version fields when publishing updates.
- Periodically remove expired sessions.
- Monitor rejected submissions and abnormal account creation.
