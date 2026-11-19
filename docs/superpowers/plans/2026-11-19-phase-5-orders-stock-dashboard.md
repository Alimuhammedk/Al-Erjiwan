# Phase 5: Orders, Automatic Stock, Admin Orders, Stock Page and Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (the owner chose native execution) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Build and merge in the three parts below; each part leaves a working site.

**Goal:** A customer can place a cash-on-delivery order; stock drops automatically and can never go below zero; Ali sees every order, follows it to delivery with ready WhatsApp messages, manages stock that is shared with the physical shop, and sees a dashboard, with an email alert for each new order.

**Architecture:** All money and stock rules live in the database, in a few `security definer` functions (`place_order`, `set_order_status`, `adjust_stock`, `track_order`, `order_summary`, `dashboard_stats`), so the browser can never choose a price, skip a stock check or change an order's status. The website only validates input, calls these functions and shows results. Prices always come from the database at the moment of ordering; the cart's prices are for display. The order is saved first; the email alert is a separate step that can fail without losing an order.

**Tech Stack:** Next.js 16 server actions and `after()`, Supabase Postgres functions and RLS, Vitest, Playwright (Edge), Resend (email, called with `fetch`, no new library).

**Spec:** `docs/superpowers/specs/2026-11-19-al-erjiwan-store-design.md` (sections 4, 10, 13, 15), `SPEC.md` sections 4 to 7, `CLAUDE.md`. Builds on phases 2 to 4 (`requireAdmin`, `createAuthClient`, cart store, `delivery_zones`, `settings`).

## Global Constraints

- Branch `phase-5-orders`; commit per task; merge to `main` only after the owner approves each part.
- Arabic only, RTL, logical CSS only (`npm run check:rtl`). All wording in `content/ar.ts`.
- Cash on delivery only. Money is whole Iraqi dinar (`numeric(12,0)`).
- **Never trust the browser:** the order function takes product ids, size ids, colour ids and quantities only; it reads every price, the delivery fee and the stock itself. No price, total or fee is ever sent from the browser or accepted from it.
- Stock is deducted when the order is placed, in the same database step that checks it, so two buyers can never both get the last unit.
- Every admin write goes through an admin-only database function or an action that calls `requireAdmin()` first. Never the `service_role` key in the website.
- Secrets (`RESEND_API_KEY`) live in `.env.local` and the hosting settings, never in code or git; `.env.example` lists the names.
- A database change is a numbered SQL file in `supabase/migrations/` that the owner pastes into the Supabase SQL Editor. The SQL tests run in a transaction that ends in `rollback`, so they leave no data behind.
- Customers' phones and addresses are private: only admins can read `orders` and `order_items` (already enforced); the public functions return only what a customer needs.
- No new libraries. Run `npm test`, `npm run lint`, `npm run check:rtl`, `npm run build` and the Playwright suite before finishing each part.

## Decisions from the owner (record in design doc section 15)

- **Shared stock:** the physical shop sells from the same stock as the website. Walk-in sales are recorded on the stock page ("بيع من المحل") and every change is logged.
- **Confirmation by WhatsApp:** Ali contacts customers on WhatsApp; the order page has ready messages. No fixed delivery company: the order page makes a copyable and WhatsApp-shareable delivery message, and has a free-text "delivery company" and "tracking note".
- **Alerts without Telegram** (not working in Iraq): email on every new order, plus a live new-orders counter in the admin. WhatsApp Business API and phone push notifications are later options.
- **My calls (change any):** stock is deducted at order time and given back on cancel; a returned order gives stock back only for ready-made products (mixed paint cannot be resold); statuses are new, confirmed, shipped, delivered, cancelled, returned; cancelled and returned are final; a "customer problem" warning shows when the same phone has a returned or cancelled order.

## Review Focus

1. Two buyers ordering the last unit at the same time: exactly one order succeeds, stock ends at 0, the other gets "sold out".
2. A tampered order (changed price or total, negative or huge quantity, another product's size id, a hidden product, an unknown governorate) never changes what is charged and never creates an order.
3. Cancelling or returning an order twice gives stock back only once; a final order cannot be reopened.
4. A phone typed with Arabic digits, spaces, `+964` or `00964` is stored as `07XXXXXXXXX`; tracking works with any of those forms; garbage is refused.
5. A failed or missing email alert never blocks, delays or loses an order.

## File structure

```
supabase/migrations/0004_orders.sql        schema changes, functions, trigger, RLS, grants
supabase/tests/0004_orders_test.sql        transactional SQL tests (ends in rollback)
lib/shop/checkout.ts                       normalisePhone, validateCheckout
lib/shop/orders.ts                         orderErrorMessage, cartToOrderItems
lib/admin/orders.ts                        status rules and WhatsApp message builders
lib/data/orders.ts                         getDeliveryZones, getOrderSummary, trackOrder
lib/notify/email.ts                        sendOrderAlert (Resend)
app/(site)/checkout/{page.tsx,actions.ts}  checkout
app/(site)/order/[code]/page.tsx           confirmation (clears the cart)
app/(site)/track/page.tsx                  customer tracking
app/admin/(protected)/orders/{page.tsx,[id]/page.tsx,[id]/print/page.tsx,actions.ts}
app/admin/(protected)/stock/{page.tsx,actions.ts}
app/admin/(protected)/settings/{page.tsx,actions.ts}
app/admin/(protected)/prices/{page.tsx,actions.ts}     (Part C)
components/shop/CheckoutForm.tsx, components/admin/{OrderActions,StockTable,LiveRefresh,...}.tsx
```

---

# Part A: Orders work end to end

### Task A1: Orders, stock and tracking in the database

**Files:**
- Create: `supabase/migrations/0004_orders.sql`, `supabase/tests/0004_orders_test.sql`

**Interfaces:**
- Produces (columns): `orders` gains `landmark text`, `delivery_company text`, `tracking_note text`, `internal_note text`, `stock_restored boolean not null default false`, `updated_at timestamptz not null default now()`, and `status` allows `new, confirmed, shipped, delivered, cancelled, returned`; `order_items` gains `product_name text`, `size_label text`, `colour_name text`, `colour_code text` (snapshots, so history survives product edits and deletes); `delivery_zones` gains `min_order numeric(12,0) not null default 0`; new table `stock_movements(id, created_at, product_id, variant_id, product_name, size_label, delta int not null, reason text check in ('order','cancel','return','manual','shop_sale'), order_id, note, by_email)` with admin-only RLS; new settings keys `low_stock_threshold` = `5`.
- Produces (functions, all `security definer`, `search_path = public`):
  - `place_order(p_name text, p_phone text, p_governorate text, p_city text, p_address text, p_landmark text, p_notes text, p_items jsonb) returns text` (the order code). `p_items` is `[{product_id, variant_id, colour_id, colour_note, quantity}]`. Raises one of: `INVALID_INPUT`, `EMPTY_CART`, `ZONE_INVALID`, `MIN_ORDER`, `PRODUCT_UNAVAILABLE:<name>`, `SIZE_REQUIRED:<name>`, `COLOUR_REQUIRED:<name>`, `OUT_OF_STOCK:<name>`. Executable by `anon` and `authenticated`.
  - `set_order_status(p_order uuid, p_status text) returns void` (admin only). Allowed: new to confirmed, shipped, delivered, cancelled; confirmed to shipped, delivered, cancelled; shipped to delivered, returned; delivered to returned. Cancelled and returned are final. On `cancelled` it restores all items' stock; on `returned` only items of non-tinted products; sets `stock_restored`, logs movements, sets `updated_at`.
  - `adjust_stock(p_product uuid, p_variant uuid, p_delta int, p_reason text, p_note text) returns int` (admin only; reason `manual` or `shop_sale`; refuses to go below 0 with `NEGATIVE_STOCK`; returns the new stock).
  - `track_order(p_code text, p_phone text) returns jsonb` (null when code and phone don't match; compares the last 10 digits of the phone) with `{status, created_at, updated_at, total, delivery_company, tracking_note, items:[{name,size,quantity}]}`.
  - `order_summary(p_code text) returns jsonb` with `{status, created_at, total, items:[{name,size,quantity}]}` and no personal data.
  - `dashboard_stats() returns jsonb` (admin only) with `new_orders`, `orders_today`, `sales_today`, `sales_month`, `out_of_stock`, `low_stock:[{name,size,stock}]` (at or below `low_stock_threshold`, 20 rows), `best_sellers:[{name,quantity}]` (last 30 days, 5 rows). Sales exclude cancelled and returned orders.
  - Trigger `sync_product_stock` on `product_variants`: after any change, set `products.stock` to the sum of that product's sizes (when it has sizes).

- [ ] **Step 1: Write `supabase/tests/0004_orders_test.sql` first.** One transaction (`begin; ... rollback;`) that creates fixtures (a category, two active products and one hidden product, a size with stock 1, a tinted product, a delivery zone with `min_order`), then uses `do $$ ... assert ... $$` blocks, switching roles with `set local role anon` and, for admin functions, `set local "request.jwt.claims" = '{"email":"mhmdkbyhanly@gmail.com"}'`. It ends with `raise notice 'ALL PASSED'`. Cases:
  - a tampered price in `p_items` is ignored and the order total equals the database price plus the zone fee;
  - the last unit: first `place_order` succeeds, second raises `OUT_OF_STOCK`, stock is 0 (the test runs the two calls one after the other; the protection against truly simultaneous buyers comes from the single conditional `update ... where stock >= q`, the standard safe pattern, which a one-transaction test cannot race);
  - quantity 0, negative, 100, a hidden product, a size of another product, an unknown governorate, a total below `min_order`, an empty list, and a tinted product with neither colour nor note are each refused with the right code and create no order and no stock change;
  - `set_order_status` cancelled restores stock once; calling it again raises; a returned order restores only non-tinted items; cancelled and returned cannot be reopened; a non-admin call raises;
  - `adjust_stock` logs a movement and refuses to go below 0;
  - `track_order` works with `07701234567`, `+9647701234567`, `009647701234567` and `0770 123 4567`, and returns null for a wrong phone or code;
  - changing a size's stock updates the product's stock (trigger).
- [ ] **Step 2: Write `0004_orders.sql`** so every case passes. `place_order` must lock and update each stock row with `update ... set stock = stock - q where id = ... and stock >= q` and treat zero rows updated as `OUT_OF_STOCK`.
- [ ] **Step 3: Owner pastes `0004_orders.sql`, then `0004_orders_test.sql`, into the Supabase SQL Editor** and reports the output; expected message `ALL PASSED` and no rows left behind.
- [ ] **Step 4: Verify the public side from here** with the public key: `rpc/place_order` with an empty list returns the `EMPTY_CART` error and writes nothing; `rpc/track_order` with a random code returns null; `rpc/dashboard_stats` and `rpc/set_order_status` are refused for the public role; `orders` and `stock_movements` are unreadable.
- [ ] **Step 5: Commit** `feat: orders, automatic stock and tracking in the database`.

### Task A2: Checkout input rules

**Files:**
- Create: `lib/shop/checkout.ts`, `lib/shop/orders.ts`
- Modify: `content/ar.ts` (`ar.checkout`)
- Test: `lib/__tests__/checkout.test.ts`

**Interfaces:**
- Produces: `normalisePhone(input: string): string | null` (Iraqi mobile, returns `07XXXXXXXXX`); `type CheckoutInput = { customer_name: string; phone: string; governorate: string; city: string | null; address: string; landmark: string | null; notes: string | null }`; `validateCheckout(raw: Record<string, FormDataEntryValue | null | undefined>): Result<CheckoutInput>`; `cartToOrderItems(items: CartItem[]): { product_id: string; variant_id: string | null; colour_id: string | null; colour_note: string | null; quantity: number }[]`; `parseOrderItems(json: string): Result<OrderItem[]>` (list of at most 50 lines, UUID ids, quantity a whole number 1 to 99); `orderErrorMessage(message: string): string` mapping database error codes to Arabic (`OUT_OF_STOCK:<name>` names the product).
- Arabic labels `ar.checkout`: `title: "إتمام الطلب"`, `name: "الاسم الكامل"`, `phone: "رقم الهاتف"`, `governorate: "المحافظة"`, `city: "المدينة أو المنطقة"`, `address: "العنوان بالتفصيل"`, `landmark: "أقرب نقطة دالة"`, `notes: "ملاحظات (اختياري)"`, `subtotal: "مجموع المنتجات"`, `delivery: "رسوم التوصيل"`, `total: "المجموع الكلي"`, `payOnDelivery: "الدفع نقدًا عند الاستلام"`, `place: "تأكيد الطلب"`, `chooseGovernorate: "اختر المحافظة"`, plus error texts `outOfStock: "نفدت كمية {name}، يرجى تعديل السلة"`, `minOrder`, `invalidPhone: "أدخل رقم هاتف عراقي صحيحًا، مثل 07701234567"`, `emptyCart`, `generic`.

- [ ] **Step 1: Write failing tests:** `normalisePhone` maps `07701234567`, `+964 770 123 4567`, `009647701234567`, `٠٧٧٠١٢٣٤٥٦٧`, `0770-123-4567` all to `07701234567`, and returns `null` for `12345`, `0770123456` (too short), `0670123456789` and letters; `validateCheckout` requires name (2 to 100 characters), phone, governorate and address (5 to 300), caps landmark, city and notes, and reports each problem on its field with an Arabic message; `parseOrderItems` rejects broken JSON, a non-list, 51 lines, a non-UUID id, quantity 0, 1.5 and 100; `orderErrorMessage("OUT_OF_STOCK:بنتلايت")` contains `بنتلايت`, and an unknown message gives the generic text; `cartToOrderItems` sends no price field.
- [ ] **Step 2:** Run `npm test -- checkout`; expect FAIL.
- [ ] **Step 3: Implement** the functions, reusing `parsePrice`'s Arabic-digit handling.
- [ ] **Step 4:** Run `npm test`; expect PASS.
- [ ] **Step 5: Commit** `feat: add checkout input rules`.

### Task A3: Place-order action and cart clearing

**Files:**
- Create: `app/(site)/checkout/actions.ts`, `lib/data/orders.ts`
- Modify: `lib/cart/CartProvider.tsx` (add `clear()`)
- Test: `lib/__tests__/place-order.test.ts`

**Interfaces:**
- Consumes: `validateCheckout`, `parseOrderItems`, `orderErrorMessage` (A2), `createServerClient`.
- Produces: `placeOrderAction(prev: ActionState, formData: FormData): Promise<ActionState>` (reads the form fields plus a hidden `items` JSON; on success `redirect("/order/<code>")`); `getDeliveryZones(): Promise<{ id: string; governorate_ar: string; fee: number; min_order: number }[]>` (active zones, `[]` on error); `getOrderSummary(code: string)` and `trackOrder(code: string, phone: string)` returning the function results or `null`; `useCart().clear(): void`.

- [ ] **Step 1: Write failing tests** (mock the Supabase client): a valid form calls `rpc("place_order", ...)` once with the normalised phone and items that have no price, then redirects to `/order/<code>`; an invalid form returns field errors and never calls the database; a database error `OUT_OF_STOCK:بنتلايت` returns the Arabic message naming the product; an empty or oversized `items` list is refused before the database; the action never forwards a `price`, `total` or `delivery_fee` sent in the form; `getDeliveryZones` returns `[]` when keys are missing or the request fails.
- [ ] **Step 2:** Run `npm test -- place-order`; expect FAIL.
- [ ] **Step 3: Implement** the action (public client, not an admin client), `lib/data/orders.ts`, and `clear()` in the provider.
- [ ] **Step 4:** Run `npm test`, `npx tsc --noEmit`, `npm run lint`; expect PASS.
- [ ] **Step 5: Commit** `feat: add place-order action`.

### Task A4: Checkout page, confirmation page and tracking page

**Files:**
- Create: `app/(site)/checkout/page.tsx`, `components/shop/CheckoutForm.tsx`, `app/(site)/order/[code]/page.tsx`, `components/shop/ClearCart.tsx`, `app/(site)/track/page.tsx`
- Modify: `components/shop/CartView.tsx` (enable the checkout button, remove the "soon" text), `components/layout/Footer.tsx` (link "تتبع طلبك"), `content/ar.ts` (`ar.order`, `ar.track`)
- Test: `e2e/checkout.spec.ts`

**Interfaces:**
- Consumes: A2 and A3.
- Produces: `/checkout` (empty cart redirects to `/cart`; governorate select from the database showing each fee; a live display of subtotal, fee and total, labelled as a preview; typed values kept after an error via `useFormAction`; the hidden `items` field); `/order/<code>` (order number, status, items and total from `order_summary`, a clear "your order is received, we will contact you on WhatsApp" message, a button that opens a pre-filled WhatsApp message to the store with the order number and items, a link to `/track`; clears the cart on load); `/track` (code and phone form using GET; shows status as a timeline, delivery company and tracking note; a neutral "no order found for these details" message).

- [ ] **Step 1: Write `checkout.spec.ts`** (no database writes): empty cart opens `/cart`; with a seeded cart in `localStorage` the checkout page shows the items and the delivery fee changes the total when a governorate is chosen; submitting with an empty name, a bad phone and no governorate shows each Arabic error and keeps what was typed; no sideways scroll at 375px; `/order/ZZZZZZZZ` for an unknown code shows a friendly not-found message; `/track` with a wrong code and phone shows the neutral message and never an error page; the cart page's checkout button is enabled and links to `/checkout`.
- [ ] **Step 2:** Run `npx playwright test checkout.spec.ts`; expect FAIL.
- [ ] **Step 3: Implement** the pages and form.
- [ ] **Step 4:** Run the checks and Playwright; expect PASS.
- [ ] **Step 5: Owner places a real test order on localhost** with the dummy data (a size with stock, then the last unit), then checks the stock dropped in the admin product list. Test orders are deleted afterwards from the orders page (Task A5).
- [ ] **Step 6: Commit** `feat: add checkout, confirmation and tracking pages`.

### Task A5: Admin orders: list, detail, status and messages

**Files:**
- Create: `lib/admin/orders.ts`, `app/admin/(protected)/orders/{page.tsx,actions.ts,[id]/page.tsx,[id]/print/page.tsx}`, `components/admin/OrderActions.tsx`, `components/admin/LiveRefresh.tsx`
- Modify: `components/admin/AdminNav.tsx` (add "الطلبات" with a new-orders badge), `content/ar.ts` (`ar.admin.orders`)
- Test: `lib/__tests__/admin-orders.test.ts`, `lib/__tests__/order-actions.test.ts`

**Interfaces:**
- Produces: `STATUSES` with Arabic labels (جديد، مؤكد، مع شركة التوصيل، تم التسليم، ملغي، مرتجع); `nextStatuses(status: string): string[]` (same rules as `set_order_status`); `customerWhatsAppUrl(order, kind: "confirm" | "update"): string` (to the customer's number, in international form, with a ready Arabic message: greeting, order number, items, the amount to pay on delivery, and for `confirm` a request to confirm the address); `deliveryMessage(order): string` (order number, customer name, phone, governorate, city, address, landmark, items with sizes and colour codes, **the amount to collect on delivery**, notes) and `deliveryWhatsAppUrl(order): string` (`https://wa.me/?text=...`, which opens WhatsApp's contact picker so Ali chooses any delivery company); `setOrderStatusAction(id: string, status: string): Promise<void>`; `saveOrderNotesAction(id: string, prev: ActionState, formData: FormData): Promise<ActionState>` (delivery company, tracking note, internal note); `deleteOrderAction(id: string)` (only for cancelled test orders); `getNewOrderCount(): Promise<number>` (orders with status `new`, admin client, 0 on error; feeds the badge in the admin menu); `LiveRefresh()` refreshes the page every 30 seconds and puts the new-order count in the browser tab title.
- Orders page: filter by status, search by code, name or phone, 20 per page, newest first, a visible "جديد" badge; the detail page shows customer, full address, landmark, items with size and colour name and code, delivery fee, total to collect, timeline, status buttons (only allowed next statuses; cancelling and returning ask for confirmation and say whether stock returns), the WhatsApp buttons, copy buttons, a print slip, and a warning when the same phone has returned or cancelled orders.

- [ ] **Step 1: Write failing tests:** `nextStatuses("new")` is `["confirmed","shipped","delivered","cancelled"]`, `nextStatuses("shipped")` is `["delivered","returned"]`, `nextStatuses("cancelled")` and `("returned")` are `[]`; `customerWhatsAppUrl` turns `07701234567` into `https://wa.me/9647701234567?text=...` and the text contains the order code and the total; `deliveryMessage` contains the address, the landmark, every item and the exact amount to collect, and escapes nothing unsafe (`encodeURIComponent` in the URL); `deliveryWhatsAppUrl` starts with `https://wa.me/?text=`; the actions call `requireAdmin` first, then `rpc("set_order_status")`, and refuse when it rejects; `deleteOrderAction` refuses anything but a cancelled order.
- [ ] **Step 2:** Run `npm test -- admin-orders order-actions`; expect FAIL.
- [ ] **Step 3: Implement** the helpers, actions and pages. Add a dev-only copy of the order detail with sample data under `/styleguide/` to check the layout at 375 and 1280px.
- [ ] **Step 4:** Run the checks and Playwright (including the dev-only copy); expect PASS.
- [ ] **Step 5: Owner trial:** open the test order from A4, press the confirm and delivery WhatsApp buttons (messages open ready), move it through the statuses, cancel one and see the stock return, print the slip, delete the test orders.
- [ ] **Step 6: Commit** `feat: add admin orders with WhatsApp messages and live refresh`.

**Part A is a complete, launchable shop.** Merge after the owner approves.

---

# Part B: Stock, dashboard, alerts and settings

### Task B1: Stock page (shared with the physical shop)

**Files:**
- Create: `app/admin/(protected)/stock/{page.tsx,actions.ts}`, `components/admin/StockTable.tsx`
- Modify: `components/admin/AdminNav.tsx` (add "المخزون"), `content/ar.ts`
- Test: `lib/__tests__/stock-actions.test.ts`

**Interfaces:**
- Produces: `adjustStockAction(formData: FormData): Promise<ActionState>` (fields `product_id`, `variant_id`, `mode` = `add` | `shop_sale` | `set`, `amount`; calls `adjust_stock`; `set` computes the difference from the current value; amount a whole number 0 to 100000); the page lists every product and size with its stock, sorted with the lowest first, a coloured badge for low and out of stock (threshold from `low_stock_threshold`), quick buttons "وصلت كمية" (add), "بيع من المحل" (sale), "تعديل الرقم" (set exact), and the last 20 movements per item with reason, change, time and who.

- [ ] **Step 1: Write failing tests:** each mode calls `adjust_stock` with the right signed delta and reason (`manual` for add and set, `shop_sale` for sale, negative delta); `set` to a number below zero or `amount` of `1.5`, `-3`, `abc` is rejected before the database; a database `NEGATIVE_STOCK` shows an Arabic message; the action calls `requireAdmin` first.
- [ ] **Step 2:** Run `npm test -- stock-actions`; expect FAIL.
- [ ] **Step 3: Implement** the action and page.
- [ ] **Step 4:** Run the checks; expect PASS.
- [ ] **Step 5: Commit** `feat: add admin stock page`.

### Task B2: Dashboard on the admin home page

**Files:**
- Modify: `app/admin/(protected)/page.tsx`, `components/admin/AdminHeader.tsx`, `content/ar.ts`
- Create: `components/admin/StatCard.tsx`
- Test: `lib/__tests__/dashboard.test.ts`

**Interfaces:**
- Consumes: `dashboard_stats()` (A1), `LiveRefresh` (A5).
- Produces: `getDashboardStats(): Promise<DashboardStats | null>` (admin client, `null` on error) and the page: cards for new orders waiting (large, linking to the orders page), today's orders and sales, this month's sales, out-of-stock count; a low-stock list linking to the stock page; best sellers (30 days); the latest 5 orders; refreshes every 30 seconds. Empty states in Arabic when there are no orders yet.

- [ ] **Step 1: Write failing tests:** `getDashboardStats` returns `null` on a database error and maps the function's result to typed numbers; a missing field becomes 0; the page renders its empty states with an all-zero result.
- [ ] **Step 2:** Run `npm test -- dashboard`; expect FAIL.
- [ ] **Step 3: Implement.** Check the layout at 375 and 1280px on a dev-only copy with sample numbers.
- [ ] **Step 4:** Run the checks and Playwright; expect PASS.
- [ ] **Step 5: Commit** `feat: add admin dashboard`.

### Task B3: Email alert for every new order

**Files:**
- Create: `lib/notify/email.ts`
- Modify: `app/(site)/checkout/actions.ts` (call it with `after()`), `.env.example`
- Test: `lib/__tests__/email-alert.test.ts`

**Interfaces:**
- Produces: `orderAlertEmail(input: { code: string; name: string; phone: string; governorate: string; city: string | null; address: string; landmark: string | null; items: { name: string; size: string | null; quantity: number }[]; total: number }): { subject: string; text: string }` (Arabic subject with the code and total; body with everything Ali needs, plus a link to the order in the admin); `sendOrderAlert(input): Promise<void>` (POST to `https://api.resend.com/emails` with `fetch`; reads `RESEND_API_KEY`, `ORDER_ALERT_EMAIL` and `ORDER_ALERT_FROM`; **never throws**, logs the failure; does nothing when a key is missing).
- Env names added to `.env.example`: `RESEND_API_KEY`, `ORDER_ALERT_EMAIL`, `ORDER_ALERT_FROM`, `NEXT_PUBLIC_SITE_URL`.

- [ ] **Step 1: Write failing tests:** `orderAlertEmail` includes the code, total, phone, address and every item; `sendOrderAlert` with a mocked `fetch` posts once with the bearer key and the right recipient; with a missing key it makes no request and does not throw; a `fetch` that rejects or returns 500 does not throw; the place-order action still redirects when the alert fails.
- [ ] **Step 2:** Run `npm test -- email-alert`; expect FAIL.
- [ ] **Step 3: Implement.** After a successful order the action reads the item names and total with `getOrderSummary(code)`, then calls `after(() => sendOrderAlert(...))`, so the customer never waits for the email.
- [ ] **Step 4:** Run `npm test`, `npm run lint`, `npm run build`; expect PASS.
- [ ] **Step 5: Owner creates a Resend account with Ali's email**, adds the keys to `.env.local`, places one test order and confirms the email (and the phone notification of the email app) arrives. If the test email goes to spam, mark it as not spam.
- [ ] **Step 6: Commit** `feat: email alert for new orders`.

### Task B4: Settings screen and shop details from the database

**Files:**
- Create: `app/admin/(protected)/settings/{page.tsx,actions.ts}`, `lib/data/settings.ts`
- Modify: `components/layout/Footer.tsx`, `components/layout/WhatsAppButton.tsx`, `app/(site)/layout.tsx`, `lib/store-info.ts`, `components/admin/AdminNav.tsx`, `content/ar.ts`
- Test: `lib/__tests__/settings.test.ts`

**Interfaces:**
- Produces: `getSettings(): Promise<StoreSettings>` (public read; falls back to the constants in `lib/store-info.ts` when a key is empty or the database fails) with `store_name`, `whatsapp_number`, `phone`, `instagram`, `address`, `opening_hours`, `guarantee_text`, `low_stock_threshold`; `saveSettingsAction(prev, formData): Promise<ActionState>`; `saveZonesAction(prev, formData): Promise<ActionState>` (per governorate: fee, minimum order, active; whole dinar, 0 or more); the settings page edits both. The footer and WhatsApp button read from `getSettings()`; the footer shows opening hours and the guarantee text when they are filled.
- Note: this removes the "shortcut: contact details are constants" comment from phase 1.

- [ ] **Step 1: Write failing tests:** `getSettings` falls back per key and survives a database error; `saveZonesAction` rejects a negative or non-numeric fee and refuses without `requireAdmin`; `saveSettingsAction` rejects a WhatsApp number that does not normalise, and `low_stock_threshold` that is not a whole number 0 to 1000; fees typed with Arabic digits are read correctly.
- [ ] **Step 2:** Run `npm test -- settings`; expect FAIL.
- [ ] **Step 3: Implement.** Set the real delivery fees in the owner trial.
- [ ] **Step 4:** Run the checks and Playwright; expect PASS.
- [ ] **Step 5: Commit** `feat: add settings screen and read shop details from the database`.

**Part B finishes the admin.** Merge after the owner approves.

---

# Part C: Bulk price changes

### Task C1: Raise or lower prices in one go, with preview and undo

**Files:**
- Create: `supabase/migrations/0005_price_changes.sql`, `lib/admin/prices.ts`, `app/admin/(protected)/prices/{page.tsx,actions.ts}`, `supabase/tests/0005_price_changes_test.sql`
- Modify: `components/admin/AdminNav.tsx`, `content/ar.ts`
- Test: `lib/__tests__/prices.test.ts`

**Interfaces:**
- Produces (TypeScript): `roundPrice(value: number, step: 250 | 500 | 1000): number` (to the nearest step, never below 0); `previewPriceChange(rows: { id: string; kind: "product" | "variant"; name: string; price: number; sale_price: number | null }[], percent: number, step: 250 | 500 | 1000): { id: string; kind: string; name: string; oldPrice: number; newPrice: number; oldSale: number | null; newSale: number | null }[]` (a sale price stays below the new price).
- Produces (database): table `price_changes(batch uuid, created_at, by_email, product_id, variant_id, old_price, old_sale_price, new_price, new_sale_price, reverted boolean)`; `apply_price_change(p_category uuid, p_percent numeric, p_step int) returns uuid` (admin only; limits `p_percent` to -50 to 100; updates `base_price`, `sale_price` and size prices in one transaction and logs every row under one batch id; returns the batch id); `revert_price_change(p_batch uuid) returns void` (admin only; restores the old values once).
- Page: choose all products or one category, a percent (plus or minus), a rounding step; a preview table with old and new prices and the count; apply only after an explicit confirmation; a history list with an "تراجع" (undo) button per batch.

- [ ] **Step 1: Write failing tests:** `roundPrice(18125, 250)` is `18000`, `(18126, 250)` is `18250`, `(0, 500)` is `0`; `previewPriceChange` raises 18000 by 10% with step 250 to 19800; a sale price of 15000 under a base of 18000 raised 10% stays below the new base; a 100% cut to zero is refused by the action; percent outside -50 to 100 is rejected; and in `0005_price_changes_test.sql` (rollback) apply then revert restores every value exactly, a second revert raises, and a non-admin call raises.
- [ ] **Step 2:** Run `npm test -- prices`; expect FAIL.
- [ ] **Step 3: Implement** the helpers, SQL and page. The owner pastes `0005` and its test.
- [ ] **Step 4:** Run the checks; expect PASS.
- [ ] **Step 5: Commit** `feat: add bulk price change with preview and undo`.

---

## Final task: Whole-phase checks, owner trial and merge

- [ ] Run `npm test`, `npm run lint`, `npm run check:rtl`, `npm run build`, `npx playwright test`; expect all PASS.
- [ ] **Owner trial (end to end, on a phone too):** place an order, see it appear in the admin and in the email, confirm it on WhatsApp, send the delivery message, move it to delivered, check the dashboard numbers and the stock page, cancel one test order and see the stock return, track an order from `/track`, change a delivery fee and see it at checkout, preview and undo a price change.
- [ ] Remove the dummy data with `supabase/seed/remove-dummy-data.sql` before real products are entered, and delete the dev-only `/styleguide` pages before launch.
- [ ] Merge each part into `main` with `--no-ff` only after the owner approves; push.

---

## Self-review notes
- Coverage: automatic stock with oversell protection, return rules, stock page with shop sales and a movement log, dashboard, orders page with status flow, WhatsApp confirm and delivery messages with the cash amount, print slip, free-text delivery company and tracking note, tracking page, email and live alerts (no Telegram), repeat-problem warning, nearest-landmark field, Iraqi phone handling, minimum order per governorate, settings for fees, hours and guarantee text, bulk price change with undo.
- Not in this plan: the colour catalogue and picker, the gallery, SEO and the static policy pages (return policy, privacy, terms), which need Ali's wording; a second staff login with limited rights; phone push notifications; automatic WhatsApp through the Business API.
- Types and names: `ActionState`, `Result`, `CartItem` (existing); `CheckoutInput` and `OrderItem` (A2) are used in A3 and B3; `nextStatuses` (A5) mirrors `set_order_status` (A1); `getSettings` (B4) supersedes `storeInfo`.
- Shortcut kept on purpose: live updates by polling every 30 seconds instead of realtime sockets; simpler and enough for a shop's order volume.
