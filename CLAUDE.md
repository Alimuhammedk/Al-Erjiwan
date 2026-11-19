# CLAUDE.md: Paint & Decor Store

> Put this file in the project root. Claude Code reads it at the start of every session.

## Project
Online store for paints and decor: [Al-Erjiwan]. Full requirements are in `SPEC.md`. Read it before starting any task.

## Stack
- Next.js (App Router), TypeScript, Tailwind CSS, Framer Motion
- Supabase for database, auth and image storage
- Deploy: [Netlify]

## Commands
- `npm run dev`: start the dev server
- `npm run build`: production build (run before saying a task is done)
- `npm run lint`: lint

## Design rules
- Modern, clean, lots of white space, large product photos
- Colours: primary [#HEX], secondary [#HEX], accent [#HEX]
- Fonts: [FONT] for headings, [FONT] for body; Arabic: [Cairo]
- Mobile first. Check every page at 375px, 768px and 1280px
- Support Arabic RTL and English; use logical CSS (`ms-`, `me-`, `ps-`, `pe-`) instead of left/right
- Subtle animations only (fade-in, hover zoom); keep the site fast

## Code rules
- Never hard-code prices, product names or banners. Always read from Supabase
- All database writes from the admin area must be checked on the server and restricted by Supabase row-level security
- Never put secret keys in code; use `.env.local` and keep it out of git
- Keep components small and reusable, in `/components`
- Use TypeScript types for all database rows
- Compress images and use `next/image`

## Workflow
- For anything bigger than a small fix, propose a plan first and wait for my approval
- Work on one phase from `SPEC.md` at a time
- After UI changes, open the page with Playwright, take screenshots at mobile and desktop widths, and fix visual problems before reporting back
- Run `npm run build` and `npm run lint` before finishing
- Summarize what changed in 3–5 lines, and tell me what I need to test myself

## Do not
- Do not install large new libraries without asking
- Do not delete data or tables without asking
- Do not change the design colours or fonts without asking

## Admin
- Admin lives at `/admin`, login required
- Admin users: [mhmdkbyhanly@gmail.com]
- Admin can manage: products, prices, stock, images, categories, colours, banners, orders, settings
