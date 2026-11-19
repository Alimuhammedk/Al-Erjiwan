# Phase 6: Colour Catalogue and Colour Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (the owner chose native execution). Steps use checkbox (`- [ ]`) syntax. Tests first; new SQL is tested locally with PGlite before the owner runs it in Supabase.

**Goal:** Ali loads his colour catalogue once (spreadsheet or one by one), and customers find a shade by typing a name or code, filtering by family, or tapping a colour wheel; they see it on an illustrated room, then go to products they can order in that shade. On mixed-paint products the customer picks a catalogue shade instead of typing.

**Architecture:** The `colours` table stays the single source of truth and is searched in the database (never loaded whole into a page), because the real catalogue may hold thousands of shades. "Closest shades to a colour" is a database function, so the wheel and the search behave the same everywhere. Pages are server-rendered from the address (`/colours?q=...&family=...&hex=...`) so results can be shared and need no heavy script. Everything reusable is a pure function with tests; the admin writes are checked on the server and by row-level security (already in place for `colours`).

**Tech Stack:** unchanged (Next.js 16, Supabase, Vitest, Playwright, PGlite). No new libraries: the wheel is a CSS conic gradient, the rooms are inline SVG.

**Spec:** `docs/superpowers/specs/2026-11-19-al-erjiwan-store-design.md` (sections 4, 13, 15), `CLAUDE.md`.

## Decisions from the owner

- **Scope:** colours only. The gallery with before/after slider moves to phase 7.
- **Finding a colour:** search by name or code, filter by family, and a colour wheel that shows the closest catalogue shades with their codes. No photo picker.
- **Mixed-paint product page:** a catalogue picker replaces the typed colour box, but the customer can still type a code or name when their colour is not listed.
- **Until the real catalogue arrives:** about 60 invented sample shades, removable with one SQL.

## My calls (change any of these)

- **Families (fixed list):** أبيض، بيج وكريمي، رمادي، أسود، أحمر، وردي، برتقالي، أصفر، أخضر، أزرق، بنفسجي، بني. A CSV row with another family is refused with its line number.
- **CSV columns:** `system, code, name_ar, name_en, hex, family` with a header row (extra columns ignored). A shade is identified by `system + code`: importing again updates it instead of duplicating. A blank code is allowed (then it is always added as new).
- **Closeness:** weighted RGB distance ("redmean") computed in the database. Good enough for "nearby shades"; the page says "الأقرب" not "المطابق".
- **Honest wording:** every colour page carries the note that screen colours differ from the wall, with the offer of a sample or a tinting check (from the board review).
- **Room preview:** four illustrated rooms (living room, bedroom, kitchen, exterior). Only the main wall takes the chosen colour.
- **Order records:** colour name and code are already saved on each order line. The `system` is shown in the catalogue and the admin only (not added to orders, to avoid changing `place_order` a third time).
- **Product page for ready-made paint** is unchanged (swatches of the colours its sizes use). Only mixed paint gets the new picker.
- **Deleting a colour** is allowed after a warning if ready-made sizes use it (the size keeps existing without a colour); old orders keep the colour name and code they saved.

## Review Focus

1. Search and the wheel never load the whole catalogue into the browser, and stay fast with 5,000 shades.
2. A CSV with Arabic digits, `#abc` short hex, quotes, commas inside names, a BOM, blank lines, duplicates and bad rows: good rows import, bad rows are listed with their line number, nothing half-imports without saying so.
3. Re-importing the same file changes nothing; importing a file with edited names updates them.
4. Searching with `%`, `,`, `(`, quotes or very long text never breaks the query.
5. The picker on mixed paint still lets an order be placed with a typed colour, and a picked colour saves its id, name and code on the order line.

## Files

```
supabase/migrations/0006_colours.sql        system column, unique (system, code), closest_colours()
supabase/tests/0006_colours_test.sql        transactional tests (ends in rollback)
supabase/seed/sample-colours.sql            ~60 invented shades (+ remove line)
lib/colours/{hex.ts,csv.ts,query.ts}        pure helpers
lib/data/colours.ts                         search, closest, one colour, products for a colour
app/(site)/colours/page.tsx                 the customer colour page
app/api/colours/route.ts                    search for the product-page picker
components/colours/{ColourWheel,ColourGrid,RoomPreview,ColourFinder}.tsx
app/admin/(protected)/colours/...           list, add, edit, CSV import
```

### Task 1: Database

**Files:** Create `supabase/migrations/0006_colours.sql`, `supabase/tests/0006_colours_test.sql`; Modify `lib/__tests__/db-orders.test.ts` (run the new test too).

**Interfaces (`search_path = public`):**
- `colours.system text` (blank means "no system"), unique index on `(coalesce(system,''), code)` where `code is not null`; index for search on `lower(name_ar)` and `lower(code)`; `family` check against the fixed list (or null).
- `closest_colours(p_hex text, p_limit int default 12) returns setof colours`: invalid hex returns nothing; limit is kept between 1 and 60; ordered by weighted RGB distance then name; executable by anyone (read-only, `stable`).

- [ ] **Step 1: Write the SQL tests first:** closest of an exact hex returns that shade first; order follows distance; limit is capped; bad hex (`zzz`, `#12`, null) returns nothing; short or lower-case hex rejected by the table check as today; duplicate `(system, code)` refused, same code in another system allowed, blank codes can repeat; a bad family refused; anon can read colours and call `closest_colours`, cannot insert; admin can.
- [ ] **Step 2:** Run (`npm test -- db-orders`); expect FAIL. **Step 3:** Write the migration; re-run; then break it on purpose (distance sign, limit cap, unique index) and confirm each is caught.
- [ ] **Step 4:** Owner runs `0006_colours.sql` then the test script in Supabase and reports **ALL PASSED**. **Step 5: Commit** `feat: colour system, unique codes and closest-shade search in the database`.

### Task 2: Pure helpers

**Files:** Create `lib/colours/hex.ts`, `lib/colours/csv.ts`, `lib/colours/query.ts`; Tests `lib/__tests__/colours-hex.test.ts`, `colours-csv.test.ts`, `colours-query.test.ts`.

**Interfaces:**
- `normaliseHex(input: string): string | null` (`#abc`, `ABC`, `#AABBCC`, Arabic digits → `#aabbcc`); `hslToHex(h, s, l)`; `readableTextOn(hex): "#000" | "#fff"` for labels on swatches.
- `FAMILIES` (the fixed list).
- `parseColourCsv(text: string): { rows: ColourRow[]; errors: { line: number; message: string }[] }` where `ColourRow = { system: string | null; code: string | null; name_ar: string; name_en: string | null; hex: string; family: string | null }`. Handles BOM, CRLF, quoted fields with commas and doubled quotes, blank lines, header detection, duplicate `(system, code)` inside the file (last wins, reported as a warning), name required (2 to 100), hex required, family from the list or blank, at most 5,000 rows (more is an error).
- `parseColourQuery(params): { q: string; family: string | null; hex: string | null; page: number }` (search text cleaned like `parseOrderListQuery`; family only from the list; hex normalised; page 1 to 500).

- [ ] **Step 1: Write failing tests** for every rule above, including the awkward inputs from Review Focus 2 and 4. **Step 2:** run, expect FAIL. **Step 3:** implement. **Step 4:** run, expect PASS. **Step 5: Commit** `feat: colour helpers for hex, CSV and search`.

### Task 3: Admin colours tab

**Files:** Create `app/admin/(protected)/colours/{page.tsx,actions.ts,new/page.tsx,[id]/page.tsx,import/page.tsx}`, `components/admin/{ColourForm,ColourImport}.tsx`, `lib/admin/colours-data.ts`; Modify `components/admin/AdminNav.tsx`, `content/ar.ts`; Tests `lib/__tests__/colour-actions.test.ts`, `e2e/admin-colours.spec.ts` (dev-only sample pages).

**Interfaces:**
- List with search box, family filter, 30 per page, a swatch, name, code, family, edit and delete (delete asks first and says how many ready-made sizes use it).
- `saveColourAction(id | null, prev, formData)`: name, English name, system, code, hex (a colour box plus a typed field, both kept in step), family from the list; duplicate `(system, code)` shows "هذا الرمز موجود" on the code field.
- `previewColourImportAction(prev, formData)`: reads the uploaded file (max 2 MB) with `parseColourCsv`, writes nothing, returns counts and the first 20 errors. `importColoursAction(prev, formData)`: validates again on the server, upserts in batches of 500 by `(system, code)`, returns how many were added, updated and skipped.
- `deleteColourAction(id)`. All actions check the admin first.

- [ ] **Step 1: Write failing tests:** actions refuse non-admins, bad ids and bad input before the database; duplicate code message; import writes in batches and reports counts; a failing batch reports how many rows were saved before it; preview never writes. **Step 2:** run, expect FAIL. **Step 3:** implement. **Step 4:** browser tests on dev-only sample pages (typed values stay after an error; preview then import flow; fits 375px); expect PASS. **Step 5: Commit** `feat: admin colour catalogue with CSV import`.

### Task 4: Customer colour page

**Files:** Create `app/(site)/colours/page.tsx`, `components/colours/{ColourWheel,ColourGrid,RoomPreview}.tsx`, `lib/data/colours.ts`; Modify `content/ar.ts` (turn the menu link on, keeping calculator and tracking last); Tests `lib/__tests__/colours-data.test.ts`, `e2e/colours.spec.ts` (dev-only sample page for the interactive parts).

**Interfaces:**
- `searchColours(q): { colours: PickableColour[]; total: number }` (24 per page, name or code, family filter, ordered by family then name), `closestColours(hex, limit)` (calls `closest_colours`), `getColour(id)`, `productsForColour(id)`: ready-made products whose sizes use it plus all mixed-paint products, each linking to the product with `?colour=<id>`.
- The page shows a search box, family chips, the wheel (a hue ring plus a lightness slider; choosing a point puts `hex` in the address and shows "الأقرب"), a grid of swatches (name and code under each, readable text colour), and a selected-colour panel with a large swatch, the four rooms (tabs) painted in it, the honest note, and the matching products. No catalogue yet: a friendly empty state.
- The wheel is keyboard usable (arrow keys change hue and lightness) and works with touch.

- [ ] **Step 1: Write failing tests** for the data helpers (queries built correctly and safely, results mapped to numbers, errors give empty lists). **Step 2:** run, expect FAIL. **Step 3:** implement. **Step 4:** browser tests on the sample page: search narrows, family chips filter, the wheel and keyboard change the closest shades, a chosen colour repaints all four rooms, the note is visible, fits 375, 768 and 1280px; expect PASS. **Step 5: Commit** `feat: customer colour page with wheel, search and room preview`.

### Task 5: Picker on mixed-paint products

**Files:** Create `components/colours/ColourFinder.tsx`, `app/api/colours/route.ts`; Modify `components/shop/ProductPurchase.tsx`, `lib/data/shop.ts` (mixed paint no longer loads every colour; a `?colour=` id is read for one shade); Tests `lib/__tests__/colours-api.test.ts`, `e2e/product-colour.spec.ts`, update `e2e/shop.spec.ts` where it relied on the typed box.

**Interfaces:**
- `GET /api/colours?q=...&family=...` returns up to 24 shades `{ id, name_ar, code, hex, family }`; the same cleaning as the page; cached for a minute; never errors out (empty list instead).
- `ColourFinder`: search box, results as swatches, chosen shade shown with name and code and a clear button, and "لونك غير موجود؟ اكتب الرمز أو الاسم" showing the typed box. Add to cart needs a chosen shade or a typed note, as today; the cart line stores `colour_id`, `colour_name` and the typed note.
- Ready-made products are untouched.

- [ ] **Step 1: Write failing tests** (route cleaning and limits, picking a shade fills the cart line, typed fallback still works, nothing chosen is refused). **Step 2:** run, expect FAIL. **Step 3:** implement. **Step 4:** browser tests (search, pick, clear, typed fallback, `?colour=` preselects, fits 375px); expect PASS. **Step 5: Commit** `feat: catalogue colour picker on mixed-paint products`.

### Task 6: Sample colours, whole-phase checks, owner trial

- [ ] Add `supabase/seed/sample-colours.sql` (about 60 shades over all families, system "عينة", plus the removal line) and tell the owner to run it for the trial.
- [ ] Run `npm test`, `npm run lint`, `npm run check:rtl`, `npm run build`, `npx playwright test`; expect all PASS.
- [ ] **Owner trial:** run `0006_colours.sql` and its test; run the sample colours; on `/colours` search a name, filter a family, move the wheel on the phone, open a shade and look at the four rooms; on a mixed-paint product search and pick a shade, add to cart, order it and check the colour name and code on the order in the admin; in the admin add one colour, import a small CSV (bad rows included) and delete one.
- [ ] Merge into `main` only after the owner approves; push.

---

## Self-review notes
- Covers every owner decision: colours only, search + family + wheel, picker with typed fallback, sample data.
- `closest_colours` (Task 1) feeds both the page (Task 4) and nothing else needs it; `parseColourQuery` and `normaliseHex` (Task 2) are shared by the page, the API and the admin list; `PickableColour` already exists in `components/admin/ColourPicker.tsx` and is reused as the shared shape.
- The older admin `ColourPicker` (used in the product form for ready-made sizes) loads the whole list and carries a "shortcut" note; it moves to the same search route in Task 5 if the catalogue is large, otherwise it is left alone.
