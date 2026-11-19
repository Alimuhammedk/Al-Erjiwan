# Al-Erjiwan (أصباغ الأرجوان) Online Store: Design

Date: 2026-11-19. Status: draft for approval. Companion files: `SPEC.md` (requirements), `CLAUDE.md` (rules).

## 1. Intent and why
A paint and decor shop in Al-Kefil, Babil, delivering across Iraq. The owner, Ali, wants customers to browse and order online, and wants to run prices, stock, photos and orders himself without coding.

Success after three months: **more orders and fewer WhatsApp messages answered by hand.** Customers currently ask about price, stock, colour choice and order status, so the site must answer all four itself. Launch is wanted as soon as possible.

**The one thing** (from the board review, `founder/board.md`): *choose a colour with confidence and order in under two minutes, from a phone.* When time is short, cut anything that does not serve this.

## 2. Goals, non-goals, anti-goals
**Goals**
- Fully Arabic, right-to-left, fast on phones (most visitors use mobile).
- Visual identity matched to the logo.
- Ali controls everything from `/admin`; changes show instantly on the live site.
- Ali owns every account and the code from day one, with a written handover guide.

**Non-goals (for now)**
- English version, online card payments (ZainCash, Qi Card), dollar prices, multiple admin users, customer accounts.

**Anti-goals** (a failure even if it technically works)
- Any price, product text or banner hard-coded in the code.
- Ali needing a developer to change a price, add a product or update a fee.
- Arabic with typos, mixed-direction glitches or broken layout on a 375px phone.
- Accounts held in the builder's name.

## 3. Constraints
- Stack fixed by the spec: Next.js (App Router), TypeScript, Tailwind, Framer Motion, Supabase (Postgres, Auth, Storage), Netlify.
- Admin writes are checked on the server and restricted by Supabase row-level security (RLS). No secret keys in code (`.env.local`, out of git).
- `next/image`, compressed images, lazy loading. Subtle animation only.
- Check every page at 375px, 768px and 1280px with Playwright screenshots. Run `npm run build` and `npm run lint` before finishing any phase.
- Do not install large libraries, delete data or tables, or change colours or fonts without asking (from `CLAUDE.md`).

## 4. Decisions made with the owner
| Area | Decision |
|---|---|
| Language | Arabic only, RTL. All site text lives in one Arabic text file so it can be proofread and edited in one place. |
| Look | Colours and theme taken from the logo (purples, with coral and orange accents). Logo supplied separately. |
| Currency | Iraqi dinar only, shown like "25,000 د.ع". |
| Payment | Cash on delivery only at launch. |
| Delivery | Fee varies by governorate. A fee table is editable in admin. Checkout shows the fee once the governorate is chosen. |
| After an order | Save to database, show a confirmation page, open a pre-filled WhatsApp message to the store with items, colours, sizes, address and total. |
| Order tracking | A page where the customer can check order status (new, confirmed, delivered, cancelled). |
| Products | Each product is marked **tinted** or **ready-made**. Tinted: customer picks any palette colour and a size; stock is counted for the base paint. Ready-made: each colour is its own stock item, with sold-out shown per colour. |
| Colour catalogue | Ali supplies it later. Build the colours table, an admin bulk import from CSV, and sample colours for development. |
| Room preview | 3–4 illustrated vector rooms (living room, bedroom, kitchen, exterior) with recolourable walls, then links to matching products. |
| Ownership | Ali creates and owns GitHub, Supabase, Netlify and the domain accounts, using his own email. The builder is added as a collaborator. A handover guide is written. |
| Process | Work in phases, one git branch per phase, review on localhost before merging. |
| Accounts | Ali has no GitHub, Supabase or Netlify account yet. In phase 1 we create them together, with Ali signing up himself using his own email. The builder never holds his passwords. |
| Board changes | Added after the board review: a litres calculator, a guarantee for damaged or wrong-colour orders, honest wording on colour preview, and a first market of Babil and neighbouring governorates before promoting nationwide. See sections 6 and 13. |

## 5. Approaches considered
- **A. Two-stage launch (chosen).** Stage 1 is phases 1–5 (shop that takes orders). Stage 2 is phases 6–8 (colour picker, gallery, SEO, speed, domain). Fastest route to the first order.
- **B. All eight phases, then launch.** Complete on day one, slowest to the first order.
- **C. Shopify or WooCommerce.** Fast, but Arabic RTL, per-governorate fees, tinted-colour ordering and the room preview all need workarounds, and Ali would not own the code. Rejected.

## 6. Build phases
Stage 1 (launchable shop):
0. Account setup with Ali (GitHub, Supabase, Netlify), done first because everything else depends on it.
1. Project setup, git, design system from the logo, RTL layout, Arabic text file, homepage.
2. Database tables, RLS policies, admin login.
3. Admin product manager with image upload and drag-to-reorder, categories, banners.
4. Shop (filters, sort, search) and product pages (size selector, colour swatches, stock, and a litres calculator that suggests how much paint a room needs) read from the database.
5. Cart, checkout, delivery fee by governorate, order saved, WhatsApp message, confirmation and tracking pages, admin orders page, settings page, FAQ.

Stage 2:
6. Colour picker with room preview, CSV colour import, before/after gallery.
7. SEO, speed, full mobile testing, full Arabic proofread.
8. Deploy on Netlify, connect the domain, final checks, handover guide.

Each phase gets a detailed implementation plan before it starts.

## 7. Git workflow
`main` is always working. Each phase is a branch (`phase-1-setup`, `phase-2-database`, and so on), checked on localhost, then merged. Commits are small and describe what changed. Pushing to GitHub starts once Ali's GitHub repository exists.

## 8. Local development
The site runs on `localhost`. It connects to a hosted Supabase project created under Ali's account (free tier), which avoids installing Docker. Database structure is kept as migration files in the repo, so the database can be recreated by anyone.

## 9. Folder structure (proposed)
```
al-erjiwan/
├─ app/                  Next.js routes: shop, product, cart, checkout, order tracking, about, FAQ, colour picker, gallery, admin/
├─ components/           small reusable parts (ui/, shop/, admin/, layout/)
├─ lib/                  supabase clients, helpers, price formatting
├─ types/                TypeScript types for every database row
├─ content/ar.ts         all Arabic site text in one file
├─ supabase/migrations/  SQL for tables, RLS policies, seed data
├─ public/               logo, room illustrations, icons
├─ docs/                 specs, plans, HANDOVER.md
├─ .env.example          names of required keys, no values
├─ SPEC.md  CLAUDE.md  README.md
```

## 10. Database changes from the spec
The nine tables in `SPEC.md` stay, plus:
- `delivery_zones`: governorate, fee, is_active.
- `products.is_tintable` (boolean). `product_variants.colour_id` (optional, for ready-made colours).
- `order_items.colour_id` and a `colour_note` for tinted orders. `orders.governorate`, `orders.delivery_fee`, and a lookup code for tracking.
- RLS: public can read active products, categories, colours, banners, settings and zones, and can create orders. Only the admin can write anything else.

## 11. Left to the builder
Exact colour hex values from the logo, type scale, component details, filter UI, animation details and test coverage, all within the rules above.

## 12. Owner decisions still needed (from the board review)
These are business choices only Ali can make. They do not block phases 0–3, but the first two shape the site text and must be settled before phase 5.
- **Target buyer:** homeowners, painters, contractors, or a mix. Decides the homepage message and product emphasis.
- **Guarantee:** what Ali will do if an order arrives damaged or the colour is wrong (replace, refund, re-tint). The site will state it in Arabic on product, checkout and FAQ pages. Wording needs his approval and a check that his margin can afford it.
- **Exclusivity:** whether Al-Jawhera Paints is sold only by Al-Erjiwan in the region. If yes, the site says so; if not, a different "why us" line is needed.
- **First market:** which governorates he serves reliably today. Default: Babil and neighbours, promoted first; the rest stay orderable.
- **WhatsApp handling:** who answers, how quickly, and what customers see when the shop is closed (opening hours set in admin settings).

## 13. Board-driven additions (summary)
- Litres calculator on product pages (phase 4), using room size and coat count; wording says "estimate".
- Colour preview carries an honest note that screen colours differ from the wall, with an offer of a sample or tinting check (phase 6).
- Guarantee text and opening hours are stored in admin settings so Ali edits them without a developer.
- Promotion starts in the first market; no nationwide advertising until deliveries there are proven.

## 14. Calls made without the owner (change any of these)
- Cairo font for headings and body (the spec allows Cairo or Tajawal).
- Palette sampled from the logo, shown for approval in phase 1 before it is used everywhere.
- One Supabase project for development and live at first, with migrations kept in the repo.
- Order tracking uses an order code plus phone number, with no customer login.
- Orders are saved first. WhatsApp is a button the customer taps, not an automatic message.

## 15. Phase 5 decisions (orders, stock, admin) and colour direction
**From the owner**
- The physical shop sells from the same stock as the website, so stock changes from walk-in sales are recorded on the stock page ("بيع من المحل") and every change is logged.
- Ali contacts customers on WhatsApp. There is no fixed delivery company, so each order has a ready delivery message (with the amount to collect) that can be copied or shared on WhatsApp, and free-text delivery company and tracking note fields.
- Telegram does not work in Iraq at the moment, so new-order alerts are an email plus a live new-orders counter in the admin. WhatsApp Business API and phone push notifications are later options.

**Calls made without the owner (change any of these)**
- Stock is deducted when the order is placed and given back when it is cancelled; a returned order gives stock back only for ready-made products, because mixed (tinted) paint cannot be resold.
- Order statuses become: new, confirmed, shipped, delivered, cancelled, returned. Cancelled and returned are final.
- A warning shows on an order when the same phone number has a returned or cancelled order before.
- Prices, delivery fee and stock are always read from the database when the order is placed; nothing the browser sends can change them.

**Colour system direction (to be planned in phase 6)**
- A searchable catalogue of shades is the source of truth: system (brand or standard), code, Arabic name, approximate screen colour, family. Ali uploads it from a spreadsheet and can add single colours by hand. Orders record the system, code and name.
- A colour wheel or photo picker is only a finder on top: it shows the closest catalogue shades with their codes. Ali will supply the catalogue later.
- The picker must search the database as the customer types, because the catalogue can have thousands of shades.

## 16. Round 2 decisions (after the first trial)
- Checkout asks for governorate, city or district and nearest landmark (both required); there is no full address box.
- Order statuses can be changed freely in any direction, including reopening cancelled and returned orders; stock follows automatically and a reopen is refused if an item has sold out.
- Any order can be deleted from the Orders tab after a confirmation; stock returns unless the order was delivered.
- Delivery fees for customers are set by the owner in the admin at any time. Delivery companies live in their own admin tab (name, WhatsApp number, notes and a price list per governorate); an order picks one company and the "send to delivery company" button opens WhatsApp to that company with the delivery message.
- The order page has one notes box, which is included in the delivery message. The home tab of the admin is a dashboard with order statuses, sales and stock levels.

## 17. Phase 6 decisions (colours)
- Phase 6 is colours only; the gallery with before/after slider moves to phase 7.
- Customers find a colour by search, family filter, or a colour wheel that shows the closest catalogue shades with their codes. No photo picker.
- On mixed-paint products a catalogue picker replaces the typed colour box, and a typed code or name is still allowed when the colour is not listed.
- About 60 invented sample shades are used until Ali supplies the real catalogue; one SQL removes them.
- Colours are searched in the database, never loaded whole into a page. The catalogue can be loaded by CSV (system, code, name, hex, family); importing again updates instead of duplicating.
