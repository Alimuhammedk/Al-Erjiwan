# Phase 4: Shop and Product Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (the owner chose native execution) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Customers can browse the shop (filter, sort, search), open a product, choose size and colour, estimate how much paint they need, and add it to a cart that is saved in their browser. Homepage cards open the product.

**Architecture:** Shop filters live in the page address (`/shop?category=...&sort=...`), so pages are shareable and rendered on the server from Supabase. All parsing, price, stock, litres and cart logic is small pure functions with tests; the pages only display them. The cart is a client-side store in `localStorage` holding what the customer picked; phase 5 re-reads prices from the database at checkout, so a tampered browser value never changes what is charged.

**Tech Stack:** Next.js 16 (server components, `searchParams` as a Promise), Supabase public reads, Framer Motion (already used), Vitest, Playwright (Edge).

**Spec:** `docs/superpowers/specs/2026-11-19-al-erjiwan-store-design.md` (sections 4, 10, 13), `SPEC.md` section 4 (Shop and Product rows), `CLAUDE.md`.

## Global Constraints

- Branch `phase-4-shop`; commit per task; merge to `main` only after the owner approves.
- Arabic only, RTL, logical CSS only (`npm run check:rtl`). All wording in `content/ar.ts`. Mobile first, checked at 375, 768 and 1280px.
- Never hard-code prices, product names or banners; everything shown comes from Supabase. Filter option lists (rooms, finishes) are labels in `content/ar.ts`.
- Prices are whole Iraqi dinar shown with `formatPrice`. Public pages read through the public client only (`createServerClient`); hidden (`is_active = false`) products are never shown or reachable.
- Images use `next/image`, product page photos are lazy except the first.
- Search text is sanitised before it reaches a database filter string.
- No new libraries. Run `npm test`, `npm run lint`, `npm run check:rtl`, `npm run build` and the Playwright suite before finishing.
- A database change needs the owner to paste a new SQL file in Supabase; the build waits for that confirmation (Task 1).

## Review Focus

1. Search text containing `, ( ) % * "` or very long text does not break the query or show an error page; the shop still renders.
2. A product address that is unknown, malformed or points to a hidden product shows the Arabic not-found page, not a crash.
3. An out-of-stock product, or a size with zero stock, cannot be added to the cart.
4. Corrupted or old cart data in `localStorage` is ignored (cart starts empty); quantities are whole numbers from 1 to 99.
5. Price range with min above max, negative or non-numeric values, and `page` of 0, negative or huge, all end up sane (swap, ignore, clamp to page 1).

## File structure

```
supabase/migrations/0003_product_filters.sql   finish, rooms columns
lib/shop/query.ts          parseShopQuery, sanitiseSearch, SORTS
lib/shop/product.ts        displayPrice, stockFor, isSoldOut, estimateLitres
lib/cart/cart.ts           pure cart functions (addItem, setQuantity, removeItem, cartCount, cartTotal, parseCart)
lib/cart/CartProvider.tsx  client context storing the cart in localStorage
lib/data/shop.ts           getShopProducts, getFilterOptions, getProductDetail
components/shop/           ShopFilters, ProductGrid, Pagination, Gallery, SizePicker, ColourPicker,
                           AddToCart, LitresCalculator, CartLink
app/(site)/shop/page.tsx, app/(site)/shop/[id]/page.tsx, app/(site)/shop/[id]/not-found.tsx
```

---

### Task 1: Room and finish fields

**Files:**
- Create: `supabase/migrations/0003_product_filters.sql`
- Modify: `types/db.ts`, `lib/admin/types.ts`, `lib/admin/validate.ts`, `components/admin/ProductForm.tsx`, `content/ar.ts`
- Test: `lib/__tests__/validate.test.ts` (extend)

**Interfaces:**
- Produces: columns `products.finish text`, `products.rooms text[] not null default '{}'`; `Product` gains `finish: string | null; rooms: string[]`; `ProductInput` gains the same; `ar.options: { finishes: string[]; rooms: string[] }` (exact values: finishes `["مطفي","نصف لامع","لامع","ساتان"]`, rooms `["غرفة المعيشة","غرفة النوم","المطبخ","الحمام","الواجهات الخارجية"]`).
- Labels: `ar.admin.products.finish: "نوع اللمعة"`, `rooms: "الغرف المناسبة"`, `noFinish: "غير محدد"`; and the price hint `ar.admin.products.basePriceHint: "للمنتجات ذات الأحجام اكتب أقل سعر. سعر التخفيض لا ينطبق على الأحجام"`.

- [ ] **Step 1: Write failing tests** in `validate.test.ts`: `validateProduct({...base, finish:"مطفي", rooms: ["المطبخ","الحمام"]})` is ok with those values; `finish:"غير موجود"` returns an error on `finish`; a room not in `ar.options.rooms` returns an error on `rooms`; absent finish and rooms give `null` and `[]`. (`validateProduct` receives rooms as repeated `rooms` form entries, so the test passes a `FormData` built with `append`.)
- [ ] **Step 2:** Run `npm test -- validate`; expect the new tests FAIL.
- [ ] **Step 3: Implement** the validation (values must come from `ar.options`), the SQL file (`alter table ... add column`, no data loss), the type changes, and the two admin form controls (dropdown for finish, checkboxes for rooms) plus the price hint under the base price.
- [ ] **Step 4:** Run `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run check:rtl`; expect PASS.
- [ ] **Step 5: Commit** `feat: add room and finish fields to products`.
- [ ] **Step 6: Owner runs `0003_product_filters.sql`** in the Supabase SQL Editor and confirms; then re-run the public read check (`products?select=finish,rooms&limit=1` with the public key returns without error).

### Task 2: Shop query parsing

**Files:**
- Create: `lib/shop/query.ts`
- Test: `lib/__tests__/shop-query.test.ts`

**Interfaces:**
- Produces: `type Sort = "newest" | "price_asc" | "price_desc"`; `type ShopQuery = { q: string; category: string | null; brand: string | null; room: string | null; finish: string | null; min: number | null; max: number | null; sort: Sort; page: number }`; `parseShopQuery(params: Record<string, string | string[] | undefined>): ShopQuery`; `sanitiseSearch(text: string): string`; `PAGE_SIZE = 24`.

- [ ] **Step 1: Write failing tests:**
  - empty params give `{ q:"", category:null, brand:null, room:null, finish:null, min:null, max:null, sort:"newest", page:1 }`.
  - `sanitiseSearch("دهان, (أبيض) 50% \"x\" *")` returns `"دهان أبيض 50 x"` (those characters removed, spaces collapsed); text over 60 characters is cut to 60.
  - `sort:"zzz"` becomes `"newest"`; `sort:"price_asc"` is kept.
  - `min:"٥٠٠٠"` becomes 5000 (Arabic digits via `parsePrice`); `min:"-5"` and `min:"abc"` become `null`.
  - `min:"9000", max:"1000"` are swapped to `min 1000, max 9000`.
  - `page:"0"`, `"-3"`, `"abc"` give 1; `page:"7"` gives 7; `page:"99999"` is clamped to 500.
  - `category` that is not a UUID becomes `null`; `room` or `finish` not in `ar.options` becomes `null`; an array value takes its first item.
- [ ] **Step 2:** Run `npm test -- shop-query`; expect FAIL.
- [ ] **Step 3: Implement** `lib/shop/query.ts` reusing `parsePrice` from `lib/admin/validate.ts` and `ar.options`.
- [ ] **Step 4:** Run `npm test`; expect PASS.
- [ ] **Step 5: Commit** `feat: add shop query parsing`.

### Task 3: Product helpers and litres estimate

**Files:**
- Create: `lib/shop/product.ts`
- Test: `lib/__tests__/shop-product.test.ts`

**Interfaces:**
- Produces: `displayPrice(p: { base_price: number; sale_price: number | null }, v?: { price: number } | null): { price: number; oldPrice: number | null }` (a chosen size uses its own price and no sale; otherwise the sale price when it is below the base price, with `oldPrice` the base price); `stockFor(p: { stock: number }, v?: { stock: number } | null): number`; `isSoldOut(p, variants: { stock: number }[], selected?): boolean` (a product with sizes is sold out when the selected size has 0, or when every size has 0 and none is selected); `estimateLitres(i: { length: number; width: number; height: number; doors: number; windows: number; coats: number }): number | null` (returns whole litres rounded up; walls = 2 × (length + width) × height minus doors × 2 m² and windows × 1.5 m², never below 0; litres = area × coats ÷ `COVERAGE_M2_PER_LITRE` where the constant is 10; returns `null` for any non-positive or non-finite dimension or `coats` outside 1 to 4).

- [ ] **Step 1: Write failing tests:**
  - `displayPrice({base_price:25000,sale_price:20000})` gives `{price:20000, oldPrice:25000}`; sale equal to or above base gives `{price:25000, oldPrice:null}`; with a variant `{price:60000}` gives `{price:60000, oldPrice:null}`.
  - `stockFor({stock:5})` is 5; with a variant `{stock:0}` is 0.
  - `isSoldOut` is true for a product with stock 0 and no sizes; false with stock 3; for sizes `[{stock:0},{stock:2}]` with nothing selected is false; with the first selected is true; for sizes all 0 is true.
  - `estimateLitres({length:4,width:3,height:2.5,doors:1,windows:1,coats:2})` equals 7 (area 35 − 2 − 1.5 = 31.5, × 2 ÷ 10 = 6.3, rounded up); `estimateLitres({length:0,...})` is `null`; `coats:5` is `null`; `height:-1` is `null`; `doors:50` never gives a negative area (result is `null` when the area is not above 0).
- [ ] **Step 2:** Run `npm test -- shop-product`; expect FAIL.
- [ ] **Step 3: Implement** the four functions. Comment on the constant: `shortcut: one coverage value for all paints (real coverage differs by product), store it per product when Ali asks.`
- [ ] **Step 4:** Run `npm test`; expect PASS.
- [ ] **Step 5: Commit** `feat: add product price, stock and litres helpers`.

### Task 4: Cart store

**Files:**
- Create: `lib/cart/cart.ts`, `lib/cart/CartProvider.tsx`
- Test: `lib/__tests__/cart.test.ts`

**Interfaces:**
- Produces: `type CartItem = { key: string; product_id: string; variant_id: string | null; colour_id: string | null; colour_note: string | null; name: string; size_label: string | null; unit_price: number; image_url: string | null; quantity: number }`; `cartKey(i: Pick<CartItem, "product_id" | "variant_id" | "colour_id" | "colour_note">): string`; `addItem(cart: CartItem[], item: Omit<CartItem, "key">): CartItem[]` (same key adds quantity, capped at 99); `setQuantity(cart, key, quantity): CartItem[]` (clamped to whole 1..99; a quantity below 1 removes nothing, use `removeItem`); `removeItem(cart, key): CartItem[]`; `cartCount(cart): number`; `cartTotal(cart): number`; `parseCart(raw: string | null): CartItem[]` (returns `[]` for invalid JSON, wrong shapes or non-array; drops items with a bad field; clamps quantities); `CartProvider({ children })` and `useCart(): { items: CartItem[]; add(item): void; setQty(key, n): void; remove(key): void; count: number; total: number }` storing under the key `al-erjiwan-cart`.

- [ ] **Step 1: Write failing tests:** adding the same product, size, colour twice merges to quantity 2; a different size makes a second line; quantity is capped at 99; `setQuantity(cart,key,0)` gives 1, `2.7` gives 2, `500` gives 99; `removeItem` drops only that key; `cartCount`/`cartTotal` sum quantity and `unit_price × quantity`; `parseCart(null)`, `parseCart("{bad")`, `parseCart('{"a":1}')` give `[]`; `parseCart` with one valid and one item missing `unit_price` keeps only the valid one; a stored quantity of 1000 is clamped to 99.
- [ ] **Step 2:** Run `npm test -- cart`; expect FAIL.
- [ ] **Step 3: Implement** the pure functions, then the provider (read `localStorage` after mount with try/catch, write on change, never throw if storage is blocked).
- [ ] **Step 4:** Run `npm test`, `npx tsc --noEmit`, `npm run lint`; expect PASS.
- [ ] **Step 5: Commit** `feat: add cart store`.

### Task 5: Shop page

**Files:**
- Create: `lib/data/shop.ts`, `components/shop/ShopFilters.tsx`, `components/shop/ProductGrid.tsx`, `components/shop/Pagination.tsx`, `app/(site)/shop/page.tsx`
- Modify: `content/ar.ts` (nav `shop` enabled, `ar.shop` labels), `components/ui/ProductCard.tsx` (link to `/shop/<id>`), `components/home/ProductRow.tsx` if needed
- Test: `lib/__tests__/shop-data.test.ts`

**Interfaces:**
- Consumes: `parseShopQuery`, `PAGE_SIZE` (Task 2), `ProductWithImage`.
- Produces: `getShopProducts(q: ShopQuery): Promise<{ products: ProductWithImage[]; total: number }>` (active products only; filters by category, brand, room membership, finish, base price range; search over `name_ar` and `name_en`; sort and page; returns `{ products: [], total: 0 }` on any error); `getFilterOptions(): Promise<{ categories: { id: string; name_ar: string }[]; brands: string[] }>`.
- `ar.shop` labels: `title: "المتجر"`, `searchPlaceholder: "ابحث عن منتج"`, `category: "الفئة"`, `brand: "العلامة التجارية"`, `room: "الغرفة"`, `finish: "نوع اللمعة"`, `minPrice: "أقل سعر"`, `maxPrice: "أعلى سعر"`, `sort: "الترتيب"`, `sortNewest: "الأحدث"`, `sortPriceAsc: "السعر: من الأقل"`, `sortPriceDesc: "السعر: من الأعلى"`, `apply: "تطبيق"`, `reset: "مسح الفلاتر"`, `results: "منتج"`, `noResults: "لا توجد منتجات مطابقة"`, `all: "الكل"`, `next: "التالي"`, `prev: "السابق"`.

- [ ] **Step 1: Write failing tests** (mock the Supabase client like `data.test.ts`): `getShopProducts` returns `{products:[],total:0}` when keys are missing, when the request throws, and when the table errors; the search text reaches the database only after `sanitiseSearch` (assert the `.or(...)` string for input `a,(b)` is `name_ar.ilike.%a b%,name_en.ilike.%a b%`); only `is_active = true` is requested.
- [ ] **Step 2:** Run `npm test -- shop-data`; expect FAIL.
- [ ] **Step 3: Implement** the data functions and the page: a GET form (`<form method="get">`, no JavaScript needed) with search, selects, price inputs and sort; result count; the grid with `ProductCard`; previous and next links that keep the other parameters; the Arabic empty state. Turn the "المتجر" nav link on. Make `ProductCard` link to `/shop/<id>`.
- [ ] **Step 4:** Run `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run check:rtl`; expect PASS.
- [ ] **Step 5:** Open `http://localhost:3000/shop` at 375 and 1280px; filters fit with no sideways scroll.
- [ ] **Step 6: Commit** `feat: add shop page with filters, sort and search`.

### Task 6: Product page

**Files:**
- Create: `app/(site)/shop/[id]/page.tsx`, `app/(site)/shop/[id]/not-found.tsx`, `components/shop/Gallery.tsx`, `components/shop/ProductPurchase.tsx`, `components/shop/LitresCalculator.tsx`
- Modify: `lib/data/shop.ts` (`getProductDetail`), `content/ar.ts` (`ar.product` labels)
- Test: `lib/__tests__/product-detail.test.ts`

**Interfaces:**
- Consumes: `displayPrice`, `isSoldOut`, `estimateLitres` (Task 3); `useCart().add` (Task 4).
- Produces: `getProductDetail(id: string): Promise<ProductDetail | null>` where `ProductDetail = { product: Product; images: string[]; variants: { id: string; size_label: string; price: number; stock: number; colour_id: string | null }[]; colours: Colour[] }` (colours are the whole palette for tinted products, and the colours used by the variants for ready-made products); returns `null` for a malformed id (not a UUID), an unknown id, a hidden product, or any error.
- `ar.product` labels: `sizes: "الحجم"`, `colours: "اللون"`, `colourNote: "أو اكتب اسم أو رقم اللون"`, `quantity: "الكمية"`, `addToCart: "أضف إلى السلة"`, `added: "تمت الإضافة إلى السلة"`, `soldOut: "نفدت الكمية"`, `inStock: "متوفر"`, `lowStock: "كمية محدودة"`, `tintNote: "يُخلط هذا الدهان حسب اللون الذي تختاره"`, `calculatorTitle: "احسب كمية الدهان"`, `length: "الطول (متر)"`, `width: "العرض (متر)"`, `height: "الارتفاع (متر)"`, `doors: "عدد الأبواب"`, `windows: "عدد النوافذ"`, `coats: "عدد الطبقات"`, `calculate: "احسب"`, `estimate: "الكمية المقدّرة: {n} لتر تقريبًا. هذا تقدير والكمية الفعلية تختلف حسب السطح"`, `invalidInput: "أدخل قياسات صحيحة"`, `notFoundTitle: "المنتج غير موجود"`, `backToShop: "العودة إلى المتجر"`.

- [ ] **Step 1: Write failing tests** (mocked client): `getProductDetail("not-a-uuid")` is `null` without calling the database; an unknown id and a database error both give `null`; a found product returns images ordered by `sort_order`, variants, and (for `is_tintable`) the colours list; a product row with `is_active = false` returns `null`.
- [ ] **Step 2:** Run `npm test -- product-detail`; expect FAIL.
- [ ] **Step 3: Implement** `getProductDetail` and the page (server component calling `notFound()` for `null`). `Gallery`: large first image, thumbnails below, first image priority-loaded. `ProductPurchase` (client): size buttons (zero-stock sizes disabled and marked sold out), colour swatches with the colour name for the selected one, a colour note input when the product is tinted, quantity 1 to 99, price from `displayPrice` (sale price struck through), stock badge, an add button disabled when `isSoldOut`, and a short confirmation message after adding. `LitresCalculator` (client): the inputs from the labels, shows `estimate` or `invalidInput`. Page also shows the description, brand, `tintNote` for tinted products. The not-found page shows `notFoundTitle` and a link back to the shop.
- [ ] **Step 4:** Run `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run check:rtl`; expect PASS.
- [ ] **Step 5: Commit** `feat: add product page with sizes, colours and litres calculator`.

### Task 7: Cart icon in the header

**Files:**
- Create: `components/shop/CartLink.tsx`
- Modify: `components/layout/Header.tsx`, `app/(site)/layout.tsx` (wrap in `CartProvider`)

**Interfaces:**
- Consumes: `useCart().count` (Task 4).
- Produces: `CartLink()` (client): a bag icon with a count badge (hidden at 0) linking to `/cart`, with the `ar.common.cart` label.

- [ ] **Step 1:** Wrap the site layout in `CartProvider` and add `CartLink` to the header (desktop and mobile).
- [ ] **Step 2:** Add a product to the cart on localhost; the badge shows the count and survives a page refresh.
- [ ] **Step 3:** Run `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run check:rtl`; expect PASS.
- [ ] **Step 4: Commit** `feat: add cart icon with count`. (The `/cart` page itself is built in phase 5.)

### Task 8: End-to-end checks, owner trial and merge

**Files:**
- Create: `e2e/shop.spec.ts`

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1: Write `shop.spec.ts`:** `/shop` shows the title "المتجر" and the search field; `/shop?sort=zzz&min=-5&max=abc&page=0&q=%2C%28%29%25` returns status below 500 and still shows the title; `/shop/not-a-uuid` and `/shop/123e4567-e89b-12d3-a456-426614174000` show "المنتج غير موجود"; no sideways scroll on `/shop` at 375, 768 and 1280px with screenshots saved.
- [ ] **Step 2:** Run `npx playwright test`, `npm test`, `npm run lint`, `npm run check:rtl`, `npm run build`; expect PASS.
- [ ] **Step 3: Owner trial on localhost** with the product Ali created in phase 3 (give it a category, finish, a room, three sizes with different stock and a photo): find it in the shop by search and by each filter; sort by price; open it; change size and watch the price change; a size with stock 0 is disabled; add to cart and see the header count; use the litres calculator; hide the product in admin and confirm its page now shows not-found; repeat the shop and product page on a phone.
- [ ] **Step 4:** Fix anything found; re-run Step 2.
- [ ] **Step 5: Merge** `phase-4-shop` into `main` with `--no-ff` only after the owner approves; push both branches.
- [ ] **Step 6:** Summarise in 3–5 lines what changed and what the owner must test.

---

## Self-review notes
- Coverage: shop grid with category, room, finish, brand and price filters, sort and search; product page with photos, description, sizes, price that follows the size, colour swatches, stock, add to cart; litres calculator from the board review; cart store and header count; homepage cards open the product. Cart page and checkout are phase 5; colour picker and CSV import are phase 6.
- Types: `ShopQuery` (Task 2) is consumed in Task 5; `displayPrice`, `isSoldOut`, `estimateLitres` (Task 3) are consumed in Task 6; `CartItem` and `useCart` (Task 4) are consumed in Tasks 6 and 7; `ProductDetail` is defined and used only in Task 6.
- Shortcuts kept on purpose: price filter and price sort use the product's base price (sizes are priced separately, so Ali enters the lowest size price as the base price, shown as a hint in admin); one paint coverage constant for the litres estimate.
- Deferred: separate colour-by-family browsing (phase 6), product pages by readable address instead of an id (phase 7, SEO).
