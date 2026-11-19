# Phases 0–1: Accounts, Project Setup and Homepage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ali owns the accounts and the repo; a fully Arabic, RTL, logo-themed homepage runs on localhost with every section reading from typed data fetchers.

**Architecture:** One Next.js App Router project. All Arabic text lives in `content/ar.ts`. Data comes from Supabase through small typed fetchers in `lib/data/` that return empty lists when the database or tables are not ready, so the homepage always renders (tables arrive in phase 2). Work happens on branch `phase-1-setup`, merged to `main` after review on localhost.

**Tech Stack:** Next.js (App Router), TypeScript, Tailwind CSS, Framer Motion, Supabase (`@supabase/supabase-js`, `@supabase/ssr`), Cairo font via `next/font/google`, Vitest (unit tests), Playwright (screenshots).

**Spec:** `docs/superpowers/specs/2026-11-19-al-erjiwan-store-design.md` (also `SPEC.md`, `CLAUDE.md`).

## Global Constraints

- Arabic only, `<html lang="ar" dir="rtl">`. Use logical CSS only (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`); never `left`/`right`/`ml-`/`mr-`/`pl-`/`pr-`.
- Currency is Iraqi dinar only, shown like `25,000 د.ع`.
- Never hard-code prices, product names or banners; read from Supabase. UI wording lives only in `content/ar.ts`.
- Font: Cairo for headings and body. Colours sampled from the logo, approved by the owner in Task 3 before wide use.
- Mobile first. Check every page at 375px, 768px and 1280px with Playwright screenshots.
- `next/image` for all images; subtle animation only (fade-in, hover zoom).
- No secrets in code: `.env.local` stays out of git; `.env.example` lists key names only.
- Run `npm run build` and `npm run lint` before finishing. Do not install large libraries, delete data, or change colours or fonts without asking.
- Vitest and Playwright are dev-only tools; Playwright is required by `CLAUDE.md`. Confirm Vitest with the owner before installing (Task 2).

## Review Focus

1. Supabase env keys missing or the database unreachable: the homepage still renders with empty states, no crash.
2. Tables not created yet (phase 1 runs before phase 2): fetchers return `[]`, not an error page.
3. Physical `left`/`right` classes slipping in and breaking RTL: a lint-style check fails the build step.
4. Long Arabic product or category names wrapping on a 375px screen without overflow.
5. `formatPrice` with 0, large numbers, and decimals: always integer dinar with thousands separators.

---

### Task 1: Accounts and repository (done with Ali)

**Files:**
- Create: `.gitignore`, `.env.example`, `README.md` (accounts section only)
- Branch: `phase-1-setup`

**Interfaces:**
- Produces: a git repo on branch `main` with an initial commit; Ali-owned GitHub repo `al-erjiwan` (private); Ali-owned Supabase project; Ali-owned Vercel account; `.env.local` holding `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

- [ ] **Step 1: Ali signs up himself** at GitHub, Supabase and Vercel using his own email; the builder never receives his passwords. Ali invites the builder as a collaborator on the GitHub repo and the Supabase organisation. Verify: Ali shows the three dashboards logged in.
- [ ] **Step 2: Ali creates a Supabase project** named `al-erjiwan`, region closest to Iraq available on the free plan. Ali copies the project URL and the `anon` key into `.env.local`. The `service_role` key is never pasted into chat or code. Verify: `.env.local` exists with two keys.
- [ ] **Step 3: `git init` in `D:\Al-erjiwan`**, write `.gitignore` (node_modules, .next, `.env*` except `.env.example`, `.claude/napkin.md` kept tracked), write `.env.example` with the two key names and empty values, commit existing files (`SPEC.md`, `CLAUDE.md`, `docs/`, `founder/`) on `main`. Verify: `git status` clean and `git log` shows one commit; `git check-ignore .env.local` prints the path.
- [ ] **Step 4: Create branch** `git switch -c phase-1-setup`. Add the GitHub remote only when Ali's repo exists; push `main` and the branch.
- [ ] **Step 5: Commit** `chore: initial commit with spec, design and plan`.

### Task 2: Scaffold the project

**Files:**
- Create: `package.json`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `tsconfig.json`, `tailwind` config, `vitest.config.ts`
- Test: `lib/__tests__/smoke.test.ts`

**Interfaces:**
- Produces: `npm run dev|build|lint|test` all working; `app/layout.tsx` exports default `RootLayout({ children })` with `<html lang="ar" dir="rtl">` and Cairo applied.

- [ ] **Step 1: Ask the owner to confirm installing Vitest** (small dev tool). Wait for yes.
- [ ] **Step 2: Scaffold** with `create-next-app` (TypeScript, Tailwind, ESLint, App Router, no `src/` folder) into the existing folder; add `framer-motion`, `@supabase/supabase-js`, `@supabase/ssr`, and dev dependencies `vitest`, `@playwright/test`.
- [ ] **Step 3: Write failing test** `smoke.test.ts` asserting that `(await import('../../content/ar')).ar.siteName` equals `"أصباغ الأرجوان"` (fails until Task 3).
- [ ] **Step 4: Configure `app/layout.tsx`** with `next/font/google` Cairo (arabic + latin subsets, `display: swap`), `lang="ar"`, `dir="rtl"`, page `<title>` from `ar.siteName`.
- [ ] **Step 5: Verify** `npm run build` and `npm run lint` pass; `npm run dev` serves at `http://localhost:3000`.
- [ ] **Step 6: Commit** `feat: scaffold Next.js app with Arabic RTL layout`.

### Task 3: Design tokens, Arabic content file and price formatting

**Files:**
- Create: `content/ar.ts`, `lib/format.ts`, `app/styleguide/page.tsx` (dev-only, removed before phase 8)
- Modify: `app/globals.css` (Tailwind theme colours)
- Test: `lib/__tests__/format.test.ts`

**Interfaces:**
- Produces: `ar` (const object: `siteName`, `tagline`, `nav: {key,label,href,enabled}[]`, `home.*`, `common.*`); `formatPrice(amount: number): string`; Tailwind colour names `brand-900`, `brand-700`, `brand-500`, `coral-500`, `orange-400`, `sun-300`, `ink`, `paper`.

- [ ] **Step 1: Write failing tests** in `format.test.ts`: `formatPrice(25000) === "25,000 د.ع"`, `formatPrice(0) === "0 د.ع"`, `formatPrice(1250000) === "1,250,000 د.ع"`, `formatPrice(25000.6) === "25,001 د.ع"` (rounded to whole dinar).
- [ ] **Step 2: Run** `npm test -- format` and confirm FAIL.
- [ ] **Step 3: Implement** `formatPrice(amount: number): string` in `lib/format.ts` using `Math.round` and Western digits with comma separators, then ` د.ع`.
- [ ] **Step 4: Run tests**, confirm PASS, and confirm the Task 2 smoke test now passes.
- [ ] **Step 5: Write `content/ar.ts`** with `siteName: "أصباغ الأرجوان"`, `tagline: "أصباغ ومواد طلاء"`, nav entries (home, shop, colours, gallery, about; colours and gallery `enabled: false` until stage 2), homepage section headings, and common labels (add to cart, out of stock, WhatsApp, empty states). Every string is proofread before Task 7.
- [ ] **Step 6: Sample the logo palette** from the supplied logo file into Tailwind theme tokens. Proposed starting values to confirm by eye: `brand-900 #3E1B66`, `brand-700 #5B2D8E`, `brand-500 #8A3FA0`, `coral-500 #E8607A`, `orange-400 #F5A04A`, `sun-300 #F7C65A`, `ink #1F1530`, `paper #FFFFFF`.
- [ ] **Step 7: Build `/styleguide`** showing the swatches, Cairo headings and body, and a buttons row. **Stop and ask the owner to approve the colours** on localhost before continuing.
- [ ] **Step 8: Commit** `feat: add Arabic content file, price formatting and brand tokens`.

### Task 4: Layout shell (header, footer, floating WhatsApp)

**Files:**
- Create: `components/layout/Header.tsx`, `components/layout/MobileMenu.tsx`, `components/layout/Footer.tsx`, `components/layout/WhatsAppButton.tsx`, `lib/store-info.ts`, `public/logo.png`
- Modify: `app/layout.tsx`
- Test: `lib/__tests__/store-info.test.ts`

**Interfaces:**
- Consumes: `ar.nav`, `ar.common`.
- Produces: `storeInfo: { whatsappNumber: string; phone: string; instagram: string; address: string }` and `whatsappLink(message?: string): string` returning `https://wa.me/<digits>?text=<encoded>`; components `Header()`, `Footer()`, `WhatsAppButton()` taking no props.

- [ ] **Step 1: Get the logo file** from the owner (original resolution) and save to `public/logo.png`; optimise it for `next/image`.
- [ ] **Step 2: Write failing test:** `whatsappLink("مرحبا")` equals `https://wa.me/9647838232417?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7` (number normalised from `009647838232417`, no leading zeros or plus).
- [ ] **Step 3: Implement** `lib/store-info.ts`. `// shortcut: contact details are constants, move to the settings table in phase 5 when admin settings exist.` Values: WhatsApp and phone `009647838232417`, Instagram `@alerjiwan_iq9`, address `الكفل، بابل`.
- [ ] **Step 4: Build `Header`** (logo, enabled nav links, cart icon placeholder) and `MobileMenu` (button toggles a panel; closes on link click and Escape; button has `aria-expanded` and an Arabic `aria-label`). Layout uses logical classes only.
- [ ] **Step 5: Build `Footer`** (brand name, tagline, contact lines, Instagram link, address) and `WhatsAppButton` (fixed to the inline-end bottom corner, opens `whatsappLink()`).
- [ ] **Step 6: Wire into `app/layout.tsx`.** Verify on localhost at 375px and 1280px that header and menu work and nothing scrolls sideways.
- [ ] **Step 7: Commit** `feat: add header, footer and WhatsApp button`.

### Task 5: Typed data layer

**Files:**
- Create: `types/db.ts`, `lib/supabase/server.ts`, `lib/data/banners.ts`, `lib/data/categories.ts`, `lib/data/products.ts`
- Test: `lib/__tests__/data.test.ts`

**Interfaces:**
- Produces: row types `Banner`, `Category`, `Product`, `ProductImage` matching `SPEC.md` section 5 field names; `getBanners(): Promise<Banner[]>` (active, sorted by `sort_order`); `getCategories(): Promise<Category[]>` (sorted by `sort_order`); `getFeaturedProducts(): Promise<ProductWithImage[]>` (`is_featured` and `is_active`, limit 8); `getSaleProducts(): Promise<ProductWithImage[]>` (those with `sale_price` set, limit 8). All return `[]` on any error.

- [ ] **Step 1: Write failing tests** with the Supabase client mocked to throw, and again with env keys absent: every fetcher resolves to `[]` and does not throw.
- [ ] **Step 2: Run** `npm test -- data` and confirm FAIL.
- [ ] **Step 3: Implement** `lib/supabase/server.ts` (`createServerClient()` returning `null` when env keys are missing) and the four fetchers, each wrapped so any error or missing table yields `[]`.
- [ ] **Step 4: Define the row types** in `types/db.ts`; no `any`.
- [ ] **Step 5: Run tests**, confirm PASS; `npm run lint`.
- [ ] **Step 6: Commit** `feat: add typed Supabase data fetchers with safe fallbacks`.

### Task 6: Homepage sections

**Files:**
- Create: `components/home/HeroSlider.tsx`, `components/home/CategoryGrid.tsx`, `components/home/ProductRow.tsx`, `components/home/ProjectsPreview.tsx`, `components/ui/ProductCard.tsx`, `components/ui/FadeIn.tsx`, `components/ui/EmptyState.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: Task 5 fetchers and types; `formatPrice`; `ar.home.*`.
- Produces: `HeroSlider({ banners }: { banners: Banner[] })`, `CategoryGrid({ categories })`, `ProductRow({ title, products })`, `ProjectsPreview()`, `ProductCard({ product })` (shows name, price via `formatPrice`, struck-through old price when `sale_price` set, hover zoom), `FadeIn({ children })`, `EmptyState({ message })`.

- [ ] **Step 1: Make `app/page.tsx` a server component** that calls all four fetchers in parallel and renders: hero, categories, best sellers, offers, projects preview.
- [ ] **Step 2: `HeroSlider`:** auto-advances every 5s with a fade (Framer Motion), pauses on hover and touch, dots with accessible labels, banner link from the row. With no banners, shows a branded fallback block using `ar.siteName` and `ar.tagline` (brand text, not a banner).
- [ ] **Step 3: `CategoryGrid`, `ProductRow`, `ProductCard`:** large `next/image` photos with `alt` from the Arabic name, lazy loaded, hover zoom, long Arabic names wrap within the card, a section renders `EmptyState` when its list is empty.
- [ ] **Step 4: `ProjectsPreview`:** heading and empty state only; real photos arrive in phase 6.
- [ ] **Step 5: Verify** with Supabase env removed that the homepage renders all headings and empty states with no console errors.
- [ ] **Step 6: Commit** `feat: add homepage sections`.

### Task 7: Visual check, proofread and merge

**Files:**
- Create: `playwright.config.ts`, `e2e/home.spec.ts`, `scripts/check-rtl.mjs`
- Modify: `package.json` (script `check:rtl`)

**Interfaces:**
- Consumes: everything above.
- Produces: screenshots in `e2e/screenshots/` at 375, 768 and 1280 widths; `npm run check:rtl` exits non-zero if any `.tsx` or `.css` file under `app/` or `components/` contains `ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-`, `text-left` or `text-right`.

- [ ] **Step 1: Write `check-rtl.mjs`** and run it against a temp file containing `ml-4`; confirm it fails, then run on the real code and confirm it passes.
- [ ] **Step 2: Write `home.spec.ts`:** at each width the page has `dir="rtl"`, no horizontal overflow (`scrollWidth <= innerWidth`), the header and footer are visible, and a screenshot is saved.
- [ ] **Step 3: Run** `npx playwright test` and `npm run build` and `npm run lint`; fix visual problems found in the screenshots.
- [ ] **Step 4: Proofread every Arabic string** in `content/ar.ts` and on the rendered page; list the strings for the owner to read.
- [ ] **Step 5: Owner review on localhost.** Ali or the owner checks `http://localhost:3000` on a phone via the local network address and approves.
- [ ] **Step 6: Merge** `phase-1-setup` into `main` (no fast-forward), commit message `feat: phase 1 setup and homepage`.
- [ ] **Step 7: Summarise** in 3–5 lines what changed and what the owner must test themselves.

---

## Self-review notes
- Spec coverage: phase 0 accounts, phase 1 layout, design system, Arabic text file, RTL, homepage, git workflow, localhost review, proofreading, owner approval of colours: all covered. Phases 2–8 are out of scope for this plan and get their own plans.
- Open dependency: the logo file at original resolution is needed in Task 4; contact details are constants until phase 5 (marked as a shortcut).
