# Phase 7: Arabic/English, Pages and Map, SEO, Speed and Proofread Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (the owner chose native execution). Steps use checkbox (`- [ ]`) syntax. Tests first; new SQL is tested locally with PGlite before the owner runs it in Supabase.

**Goal:** A customer can switch the whole shop between Arabic (right-to-left) and English (left-to-right); the About, FAQ, Return policy and Privacy pages exist and Ali edits them in the admin in both languages, with a small store map on the About page; Google can find and understand the shop; pages are fast on a phone; every Arabic and English word has been proofread.

**Architecture:** All fixed words move behind one message set per language (`content/ar.ts` exists; `content/en.ts` is new and must have the same keys, checked by a test). The chosen language is a cookie, read on the server for every page, so pages render in the right language and direction with no flash and no extra address prefix. Shop content (products, categories, colours, articles, banners, pages) keeps one box per language; English falls back to Arabic when its box is empty. The admin stays Arabic. Pages the owner edits live in a small `site_pages` table.

**Tech Stack:** unchanged (Next.js 16, Supabase, Vitest, Playwright, PGlite). No new libraries.

**Spec:** `docs/superpowers/specs/2026-11-19-al-erjiwan-store-design.md` (sections 4, 13, 17), `CLAUDE.md`.

## Decisions from the owner

- **Language switch:** Arabic / English for the whole **customer site**; the admin stays Arabic; WhatsApp messages Ali sends customers stay Arabic.
- **English content:** products, categories and colours use the English name boxes that already exist (Arabic is shown when English is empty). Articles, pages, banners and product descriptions get optional English boxes in the admin.
- **Pages:** About, FAQ, Return policy, Privacy, editable in the admin.
- **Map:** on the About page, from a Google Maps link Ali pastes in the admin. No key and no cost.
- **Product addresses:** stay as they are (`/shop/<id>`).
- **Also in this phase:** SEO, speed, full mobile testing, full proofread.
- **Not in this phase:** email alerts for new orders, the bulk price tool, the project gallery.

## My calls (change any of these)

- **Default language is Arabic.** The switch is a button in the top bar (and the phone menu) showing the other language ("English" / "عربي"). The choice is remembered for a year in a cookie. There is no `/en` address prefix, so Google indexes the Arabic site; English is for visiting customers.
- **English layout** uses the same pages mirrored left-to-right (the site already uses start/end spacing everywhere, and a test enforces it). Arrows and sliders flip with the direction.
- **Prices in English** read "25,000 IQD"; dates use English words; digits stay ordinary digits in both languages.
- **Orders:** the language does not change what is saved. Order status words the customer sees on the tracking page follow the chosen language.
- **Starter wording** for the four pages is written by me in Arabic and English and marked as a draft in my report; Ali must read and approve it (return policy and privacy are business and legal choices only he can make).
- **Map links we can embed:** a full Google Maps address (with coordinates in it), plain coordinates ("32.2,44.3"), or the "Embed a map" code. A short link (`maps.app.goo.gl/...`) cannot be embedded, so for it the page shows only an "Open in Maps" button and the admin explains how to get an embeddable link.
- **Search engines:** each page gets its own title and description (in the chosen language), a sitemap (home, shop, products, articles, pages), a robots file that hides the admin, cart, checkout, order and tracking pages, share previews (logo or product photo), and product and shop details in the form Google reads for rich results.
- **Speed:** public pages are cached for 60 seconds and refreshed at once when Ali saves something in the admin (so changes still appear straight away); product photos use the right sizes; only the first slide loads eagerly.
- **Cleanup before launch:** the dev-only `/styleguide` pages already return "not found" in production, so they can stay for testing; the dummy data and sample colours are removed in phase 8 with the real catalogue.

## Review Focus

1. Every key in `ar.ts` (customer part) exists in `en.ts` and the other way round; no English page shows an Arabic word that was meant to be translated, and no Arabic page shows English.
2. Switching language never loses the cart, a half-filled checkout, or the page the customer was on.
3. English (left-to-right) layout: no overlapping, no cut-off text, sliders and arrows point the right way, numbers and phone numbers stay readable, at 375, 768 and 1280px.
4. A pasted map link can never put anything but a Google map on the page (no scripts, no other sites), and a bad link just hides the map.
5. The sitemap and robots file never list or reveal admin, order or customer pages; the product data Google reads always matches the page (price, stock).
6. Saving in the admin shows up on the public page within seconds even with caching.

## Files

```
supabase/migrations/0009_languages_and_pages.sql   English columns, site_pages (+ starter pages)
supabase/tests/0009_languages_and_pages_test.sql   transactional tests (ends in rollback)
content/en.ts                                       the English words (same keys as ar.ts, customer part)
lib/i18n/{lang.ts,messages.ts,provider.tsx}         language, cookie, server and client access
lib/format.ts                                       price and date per language
lib/maps.ts                                         read and check a pasted map link
lib/seo.ts                                          site address, titles, product and shop data for Google
app/sitemap.ts, app/robots.ts                       for search engines
app/(site)/{about,faq,returns,privacy}/page.tsx     the pages
app/admin/(protected)/pages/...                     the admin editor for the pages
components/layout/LanguageSwitch.tsx
```

### Task 1: Database

**Files:** Create `supabase/migrations/0009_languages_and_pages.sql`, `supabase/tests/0009_languages_and_pages_test.sql`; Modify `lib/__tests__/db-orders.test.ts`.

**Interfaces:**
- `articles`: add `title_en text`, `excerpt_en text`, `body_en text` (same length limits as the Arabic ones). `banners`: add `title_en text`. `products`: add `description_en text`.
- `site_pages(slug text primary key check (slug in ('about','faq','returns','privacy')), title_ar text, title_en text, body_ar text, body_en text, map_url text, updated_at timestamptz)`: lengths checked (title 150, body 20000, map 1000); public read, admin write; four starter rows inserted (Arabic and English wording, empty map link). A trigger keeps `updated_at` current.

- [ ] **Step 1: Write the SQL tests first:** the new columns accept and refuse the right lengths; visitors read `site_pages` but cannot write; a non-admin signed-in user cannot write; the admin can; a fifth slug is refused; the four starter pages exist with Arabic and English text; `updated_at` moves on edit.
- [ ] **Step 2:** Run (`npm test -- db-orders`); expect FAIL. **Step 3:** Write the migration; re-run; then break it on purpose (public write grant, slug check, length check) and confirm each is caught.
- [ ] **Step 4:** Owner runs `0009_languages_and_pages.sql`, then its test script in Supabase, and reports **ALL PASSED**. **Step 5: Commit** `feat: English columns and editable pages in the database`.

### Task 2: Language foundation

**Files:** Create `content/en.ts`, `lib/i18n/{lang.ts,messages.ts,provider.tsx}`, `components/layout/LanguageSwitch.tsx`; Modify `app/layout.tsx`, `lib/format.ts`; Tests `lib/__tests__/i18n.test.ts`, `lib/__tests__/messages-parity.test.ts`, `e2e/language.spec.ts`.

**Interfaces:**
- `type Lang = "ar" | "en"`; `parseLang(cookieValue): Lang` (anything but "en" is "ar"); `dirOf(lang)`; `LANG_COOKIE = "lang"`.
- `getMessages(): Promise<Messages>` (server, reads the cookie) and `useMessages()` (client, from a provider the root layout fills); `Messages` is the customer part of `ar.ts`; `en.ts` is checked against it by the type and by a test that walks both objects and compares every key and every `{placeholder}`.
- `localised(lang, ar, en)`: the English text when it is not blank, otherwise the Arabic.
- `setLanguageAction(lang)`: sets the cookie (one year, `Lax`) and returns; `LanguageSwitch` calls it and refreshes the page. The root layout sets `lang` and `dir` from the cookie.
- `formatPrice(amount, lang)`: "25,000 د.ع" / "25,000 IQD"; `formatDate`/`formatDateTime` take the language.

- [ ] **Step 1: Write failing tests:** cookie parsing (missing, "ar", "en", junk, very long); `dirOf`; `localised` with blank and spaces-only English; message parity (every key, every placeholder, no empty English value); price and date text in both languages; the layout shows `dir="ltr" lang="en"` with the cookie set and `rtl`/`ar` without; the switch changes the cookie, keeps the current page and the cart.
- [ ] **Step 2:** Run; expect FAIL. **Step 3:** Implement. **Step 4:** Run; expect PASS. **Step 5: Commit** `feat: language switch foundation with cookie, messages and formats`.

### Task 3: Move every customer word behind the language

**Files:** Modify every customer file that imports `@/content/ar` (about 45: layout, home, shop, product, cart, checkout, order, tracking, calculator, articles, plus `lib/shop/*`, `lib/colours/*` messages shown to customers), and `content/en.ts`.

**Interfaces:** server components call `getMessages()`, client components call `useMessages()`; server actions that return messages (`placeOrderAction`, tracking) read the language from the cookie; functions that build text take `Messages` (or `lang`) as an argument instead of importing `ar`.

- [ ] **Step 1: Tests first** for each changed function (checkout errors, order error messages, status words, timeline, calculator text, cart text) in both languages; browser tests (below).
- [ ] **Step 2:** Move one area at a time (top bar and footer; home; shop and product; cart and checkout; order and tracking; calculator; articles), writing the English wording as each area moves, and running its tests before the next.
- [ ] **Step 3: Browser tests, in both languages and at 375, 768 and 1280px:** the full ordering path (home, shop, product, colour, cart, checkout form errors, tracking) shows no Arabic word in English and no English word in Arabic (checked by scanning visible text for the other script outside names and codes); direction, sliders and arrows flip correctly; no horizontal page scroll; no overlap; screenshots reviewed.
- [ ] **Step 4: Commit** `feat: whole customer site in Arabic and English`.

### Task 4: English boxes for content

**Files:** Modify `lib/articles.ts`, `lib/admin/validate.ts` (banner, product description), the article, banner and product admin forms, `app/(site)` pages that show products, categories, colours, articles and banners; Tests `articles.test.ts`, `validate.test.ts`, `localised` use in cards and pages, `e2e/language.spec.ts`.

**Interfaces:** each admin form gets an optional English box next to the Arabic one (title, summary, text, description) with a hint "leave empty to show the Arabic"; saving keeps empty English as nothing; every public place that shows a name or text picks it with `localised(lang, ar, en)`; search matches both names (already does for products).

- [ ] **Step 1: Write failing tests:** validation of the new boxes (length, trimming, empty becomes null); display picks English when present and Arabic when not (products, categories, colours, articles, banners); an article with only Arabic still shows in English.
- [ ] **Step 2:** Run; expect FAIL. **Step 3:** Implement. **Step 4:** Browser tests with sample data in both languages; expect PASS. **Step 5: Commit** `feat: optional English text for products, articles and banners`.

### Task 5: Pages and the store map

**Files:** Create `lib/maps.ts`, `lib/pages.ts`, `app/(site)/{about,faq,returns,privacy}/page.tsx`, `components/pages/{PageView,StoreMap}.tsx`, `app/admin/(protected)/pages/{page.tsx,[slug]/page.tsx,actions.ts}`, `components/admin/PageForm.tsx`; Modify footer, `AdminNav`/`lib/admin/nav.ts` (tab "الصفحات"), `content/ar.ts`, `content/en.ts`; Tests `maps.test.ts`, `pages.test.ts`, `page-actions.test.ts`, `e2e/pages.spec.ts`.

**Interfaces:**
- `parseMapLocation(input): { embedUrl: string | null; openUrl: string } | null`: accepts a full Google Maps address with coordinates (`@lat,lng`, `?q=lat,lng`, `!3dLAT!4dLNG`), plain `lat,lng` (Arabic digits too), and the Embed code or its `src`; builds the embed address only from numbers or from a `google.com/maps/embed` address; a short link gives `embedUrl: null` with only the open link; anything else (other sites, scripts, `javascript:`, `//evil`, over 1000 characters, impossible coordinates) gives `null`.
- `savePageAction(slug, prev, formData)`: Arabic and English title and text (limits as the table), the map link (About only) checked with `parseMapLocation`; slug must be one of the four; admin only. `getPage(slug)`.
- Pages render the text as paragraphs (blank line = new paragraph, same rule as articles) in the chosen language (English falls back to Arabic when empty). The About page shows `StoreMap` (an `iframe` with `loading="lazy"`, no scripts allowed, fixed height, plus "Open in Maps"). The footer links to the four pages; the admin "الصفحات" tab lists them with an edit form each.

- [ ] **Step 1: Write failing tests:** every accepted and refused map input above (including Arabic digits, `lat,lng` out of range, a short link, a `javascript:` link); the page action refuses non-admins, a fifth slug, over-long text, a bad map link; pages show the right language and fall back; the map never renders an `iframe` for a null result.
- [ ] **Step 2:** Run; expect FAIL. **Step 3:** Implement. **Step 4:** Browser tests (pages in both languages, map shown and hidden, footer links, edit form keeps typed values, fits 375px); expect PASS. **Step 5: Commit** `feat: About, FAQ, return policy and privacy pages with editable text and a store map`.

### Task 6: SEO

**Files:** Create `lib/seo.ts`, `app/sitemap.ts`, `app/robots.ts`, `app/opengraph-image` (or the logo as the default share image); Modify `generateMetadata` on home, shop, product, article and page routes, `app/layout.tsx`; add `NEXT_PUBLIC_SITE_URL` to `.env.example` (the real address is set in phase 8); Tests `lib/__tests__/seo.test.ts`, `e2e/seo.spec.ts`.

**Interfaces:** `siteUrl()` (from the environment, never a path the visitor typed); `productJsonLd(product, lang)` (name, image, description, price in IQD, availability from stock) and `shopJsonLd()`; `sitemapEntries()` lists home, shop, calculator, the four pages, published articles, active products; `robots` allows the public site and blocks `/admin`, `/api`, `/cart`, `/checkout`, `/order`, `/track`, `/styleguide`. Titles are "page | shop name"; descriptions under 160 characters; every page has one `h1`.

- [ ] **Step 1: Write failing tests:** JSON-LD for in-stock, out-of-stock, sale and sized products; sitemap includes what it should and nothing hidden; robots text; titles and descriptions per page and language; a product that is hidden or deleted is not in the sitemap and its page says "not found" with no indexing.
- [ ] **Step 2:** Run; expect FAIL. **Step 3:** Implement. **Step 4:** Browser tests (view-source checks of title, description, share tags, JSON-LD, `h1` count) in both languages; expect PASS. **Step 5: Commit** `feat: search engine titles, sitemap, robots and product data`.

### Task 7: Speed

**Files:** Modify public pages (`revalidate = 60`), admin save actions (`revalidatePath` for the pages they change), image sizes and `priority` on the first slide and product photo, `next.config.ts` if image formats need it; Tests `lib/__tests__/revalidate.test.ts`, `e2e/speed.spec.ts`.

**Interfaces:** each admin action that changes public content calls `revalidatePath` for the affected pages (home, shop, product, article, pages, sitemap) after a successful save; nothing is revalidated on a failed save.

- [ ] **Step 1: Write failing tests:** every content-changing admin action revalidates the right paths after success and none after failure; a cached page shows an admin change on the next request (browser test with a dev-only sample action).
- [ ] **Step 2:** Run; expect FAIL. **Step 3:** Implement. **Step 4:** Measure before and after (page weight, number of requests, largest image, layout shift) on home, shop and a product at phone size with Playwright and report the numbers; fix the worst finding; expect no layout shift from images or sliders. **Step 5: Commit** `perf: cached public pages that refresh on save, tuned images`.

### Task 8: Proofread, whole-phase checks and owner trial

- [ ] Read every customer string in both languages (I list wording questions for Ali instead of guessing); fix typos, mixed digits, wrong plurals, inconsistent words (one word per thing: "السلة", "الطلب", "المحافظة"); check that error messages say what to do.
- [ ] Run `npm test`, `npm run lint`, `npm run check:rtl`, `npm run build`, `npx playwright test`; expect all PASS. Take and review screenshots of every page in both languages at 375, 768 and 1280px.
- [ ] **Owner trial:** run `0009_languages_and_pages.sql` and its test; switch language on the phone and place a test order in English and in Arabic; read the four pages and approve or change their wording in the admin; paste the store's Google Maps link in the About editor and check the map; write an English version of one article and one product description; view the page source of the home page and a product to see the titles.
- [ ] Merge into `main` only after the owner approves; push.

---

## Self-review notes
- Covers every owner decision: Arabic/English switch (customer site, English boxes), About/FAQ/Return/Privacy editable in the admin, map from a pasted link, SEO, speed, full proofread, product addresses unchanged.
- `getMessages`/`useMessages` and `localised` (Task 2) are used by every later task; `parseMapLocation` (Task 5) is the only place that decides what the map shows; `sitemapEntries` (Task 6) reads the same "published/active" rules as the pages.
- The biggest work is Task 3 (about 45 files); it is done area by area with tests so nothing is half-translated.
- Email alerts and the bulk price tool stay in the original plan for a later phase; deploy and domain are phase 8.
