# Al-Erjiwan (أصباغ الأرجوان)

Arabic online store for paints and decor. Requirements: `SPEC.md`. Rules: `CLAUDE.md`. Design: `docs/superpowers/specs/`. Plans: `docs/superpowers/plans/`.

## Accounts (owned by Ali)
Ali signs up himself, with his own email, for each service below. Never share passwords in chat or commit them.

| Service | Used for |
|---|---|
| GitHub | the code (private repo `al-erjiwan`) |
| Supabase | database, admin login, image storage (project `al-erjiwan`) |
| Vercel | hosting the live site |

## Run locally
```bash
npm install
cp .env.example .env.local   # then fill in the two Supabase keys
npm run dev                  # http://localhost:3000
```
`.env.local` is never committed. Only the Supabase project URL and the public `anon` key go in it; never the `service_role` key.
