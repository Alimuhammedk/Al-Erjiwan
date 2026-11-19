# Phase 5, Round 2: Admin Changes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (the owner chose native execution). Steps use checkbox (`- [ ]`) syntax. Tests first; the SQL is tested locally with PGlite before the owner runs it in Supabase.

**Goal:** Ali can switch an order freely between any statuses, delete orders easily, send orders to delivery companies he set up once (with their prices), set delivery fees himself, and see a real dashboard with order statuses and stock levels. Customers give a city/district and a nearest landmark instead of a long address.

**Architecture:** Same as Part A: rules about money and stock live in database functions; the website validates and displays. Stock changes on any status move follow one rule (below), so moving back and forth can never double-count. This round also finishes the stock page and dashboard from the original Part B, and adds two new admin tabs.

**Tech Stack:** unchanged (Next.js 16, Supabase, Vitest, Playwright, PGlite for local SQL tests).

**Spec:** `docs/superpowers/specs/2026-11-19-al-erjiwan-store-design.md` (section 15), `docs/superpowers/plans/2026-11-19-phase-5-orders-stock-dashboard.md` (Part A done), `CLAUDE.md`.

## Decisions from the owner

- **Location at checkout:** governorate, **المدينة أو القضاء** (required) and **أقرب نقطة دالة** (required). The big address box is removed; the address Ali sees is made from the two.
- **Statuses:** any status to any other, always visible, including reopening cancelled and returned orders.
- **Deleting:** any order can be deleted from the Orders tab after a confirmation; stock returns automatically if the order was not delivered.
- **Delivery companies tab:** name, WhatsApp number, notes, and a **price list per governorate** (what the company charges Ali). The order page picks a company from this tab; the customer's delivery fee stays a separate setting.
- **Delivery fees:** set and changed by Ali in the admin at any time (a tab with one fee per governorate).
- **Customer pages:** order number is easy to copy and there is no "send details" button (done), tracking is the last link in the top bar (done).
- **Order page:** remove "نسخ رسالة التوصيل"; remove "التوصيل والملاحظات" and keep one **ملاحظات** field, which is included in the delivery message to the company.

## My calls (change any of these)

- **Stock rule for moving between statuses:** each status holds a "stock given back" amount per item: active statuses (new, confirmed, shipped, delivered) give back 0; cancelled gives back everything; returned gives back everything except mixed (tinted) paint. Moving between statuses changes stock by the difference. Moving back out of cancelled or returned takes stock again and is refused with the product's name if it has sold out meanwhile.
- **Deleting:** a new, confirmed or shipped order gives all its stock back when deleted; a cancelled or returned order has already been handled; a delivered order gives nothing back (the goods left). Deleting also removes it from sales totals.
- **Delivery cost on an order:** when a company is picked, the order stores the company's name and its price for that governorate (kept even if the company is later changed or deleted), and shows the difference from the fee the customer paid.
- **Tracking page** shows the company name but no tracking note (that field is dropped from the screens).
- **Dashboard (الرئيسية)** shows: orders per status (clickable), orders and sales today and this month, a stock summary (available, low, out) with the low and out-of-stock items listed, best sellers (30 days) and the latest 5 orders. It refreshes every 30 seconds.
- **Not in this round:** email alerts, the store details screen (name, hours, guarantee text) and bulk price changes; they stay in the original plan.

## Review Focus

1. Moving an order cancelled → new → cancelled → new many times never changes stock beyond one deduction; reopening when an item has sold out is refused and changes nothing.
2. Deleting an order gives its stock back exactly once and never for a delivered order; deleting a cancelled order does not add stock again.
3. A governorate fee or company price typed with Arabic digits, empty, negative or text is read correctly or refused; a blank company price means "no price", not 0.
4. A company's WhatsApp number typed any common way becomes `07XXXXXXXXX` and opens the right chat; deleting a company never breaks old orders.
5. Checkout without a city or without a landmark is refused (page and database); no crash if a city holds Arabic punctuation.

## Files

```
supabase/migrations/0005_order_changes.sql    status rule, delete_order, companies, dashboard, place_order
supabase/tests/0005_order_changes_test.sql    transactional tests (ends in rollback)
lib/shop/checkout.ts                          city and landmark required, address composed
lib/admin/orders.ts                           ALL_STATUSES, message builders (company number, notes)
lib/admin/delivery.ts                         fee and company validation
lib/data/delivery.ts                          zones and companies for the admin
app/admin/(protected)/{delivery-fees,delivery-companies,stock}/...
components/admin/{OrderActions,DeliveryCompanyPicker,OrderRowActions,StockTable,...}.tsx
```

### Task 1: Database (migration 0005 and its tests)

**Files:** Create `supabase/migrations/0005_order_changes.sql`, `supabase/tests/0005_order_changes_test.sql`; Modify `lib/__tests__/db-orders.test.ts` (also run the 0005 test); update `supabase/tests/0004_orders_test.sql` where the new status rule changes its expectations.

**Interfaces (all `security definer`, `search_path = public`):**
- Tables: `delivery_companies(id, name, whatsapp text check ~ '^07[0-9]{9}$', notes, is_active, sort_order, created_at)`; `delivery_company_prices(company_id, zone_id, price numeric(12,0) >= 0, primary key (company_id, zone_id))`; both admin-only (RLS, grants to `authenticated`). `orders` gains `delivery_company_id uuid references delivery_companies on delete set null` and `delivery_cost numeric(12,0)`; column `internal_note` is renamed `delivery_notes`. `stock_movements.reason` also allows `reopen` and `delete`.
- `restored_qty(status text, qty int, tinted boolean) returns int` (immutable): cancelled → qty; returned → 0 if tinted else qty; any other status → 0.
- `set_order_status(p_order uuid, p_status text) returns void` (admin): any status to any different status; stock changes by the difference of `restored_qty` per item; a deduction that would go below zero raises `OUT_OF_STOCK:<product name>` and changes nothing; same status raises `INVALID_TRANSITION`; unknown status raises `INVALID_INPUT`; logs a movement per item (`cancel`, `return` when stock goes back, `reopen` when it is taken again).
- `delete_order(p_order uuid) returns void` (admin): for new, confirmed and shipped orders gives all stock back (movement reason `delete`); cancelled, returned and delivered give nothing more; then deletes the order (items follow, movements keep their history).
- `place_order(...)` (same signature): city and landmark are required (at least 2 characters each); if the address is empty it is composed as `city - landmark`.
- `track_order` no longer returns a tracking note; it returns the company name.
- `dashboard_stats()` also returns `by_status` (counts for all six statuses) and `stock_summary` `{available, low, out}` (active products without sizes plus every size of active products; low means at or below the threshold setting).

- [ ] **Step 1: Write the SQL tests first** (update 0004's test where cancelled and returned were final; add `0005_order_changes_test.sql` covering): cancel → new takes the stock again; cancel → new → cancel → new many times ends at the right stock; reopening when the item has sold out is refused and nothing changes; cancel → returned for a mixed-paint line deducts again, returned → cancelled gives it back; delivered → new, any status to any other works; same status refused; delete of a new, confirmed and shipped order returns stock once; delete of cancelled, returned and delivered orders adds nothing; delete by a non-admin refused; place_order refuses a missing city and a missing landmark and composes the address; a company with a bad WhatsApp number is refused by the table; deleting a company keeps its orders (company id empty, name and cost kept); dashboard `by_status` has all six keys and `stock_summary` adds up.
- [ ] **Step 2:** Run the SQL tests locally (`npm test -- db-orders`); expect FAIL.
- [ ] **Step 3:** Write the migration so every case passes. Re-run the deliberate-breakage check (stock rule, delete twice, non-admin) and confirm each break is caught.
- [ ] **Step 4:** Owner runs `0005_order_changes.sql`, then `0005_order_changes_test.sql` in Supabase and reports **ALL PASSED**; I then check the public side from here.
- [ ] **Step 5: Commit** `feat: free status changes, delete order, delivery companies and richer dashboard in the database`.

### Task 2: Checkout without the address box

**Files:** Modify `lib/shop/checkout.ts`, `components/shop/CheckoutForm.tsx`, `app/(site)/checkout/actions.ts`, `content/ar.ts`; Tests `lib/__tests__/checkout.test.ts`, `lib/__tests__/place-order.test.ts`, `e2e/checkout.spec.ts`.

**Interfaces:** `CheckoutInput.city: string` and `landmark: string` become required (2 to 100 and 2 to 150 characters, errors `أدخل المدينة أو القضاء` and `أدخل أقرب نقطة دالة`); `CheckoutInput.address: string` is composed as `city - landmark` and sent to `place_order` as before; there is no address field in the form.

- [ ] **Step 1: Write failing tests:** missing or one-letter city and landmark give their field errors; the composed address is `الكفل - قرب الجامع`; the form has no address box; the action sends the composed address; an over-long city or landmark is refused.
- [ ] **Step 2:** Run the tests; expect FAIL. **Step 3:** Implement. **Step 4:** Run all checks; expect PASS. **Step 5: Commit** `feat: checkout asks for city and landmark instead of a full address`.

### Task 3: Order page: free statuses, delete, companies, notes

**Files:** Modify `lib/admin/orders.ts`, `lib/admin/orders-data.ts`, `app/admin/(protected)/orders/{actions.ts,page.tsx}`, `components/admin/{OrderDetailView,OrderActions,NotesForm}.tsx`, `content/ar.ts`; Create `components/admin/{DeliveryCompanyPicker,OrderRowActions}.tsx`; Tests `lib/__tests__/{admin-orders,order-actions,orders-admin-data}.test.ts`, `e2e/admin-orders.spec.ts`.

**Interfaces:**
- `ALL_STATUSES` (the six, in order); `nextStatuses` is replaced by "every status except the current one". `setOrderStatusAction(id, status)` shows `OUT_OF_STOCK:<name>` as `نفدت كمية <name>، لا يمكن إعادة الطلب` and any other refusal as a clear Arabic message.
- `deleteOrderAction(id): Promise<ActionState>` (calls `delete_order`; never needs the order to be cancelled); the Orders list gets a delete button on every row with a confirmation that says whether stock returns (it does not for delivered orders) and warns that sales totals change.
- `assignDeliveryCompanyAction(orderId: string, companyId: string | null): Promise<ActionState>` stores `delivery_company_id`, the company name and the company's price for the order's governorate (or `null` when it has no price); `null` clears all three.
- `saveOrderNotesAction(id, prev, formData)` saves only `delivery_notes` (max 1000). `AdminOrder` gains `delivery_company_id`, `delivery_cost`, `delivery_notes` and loses `tracking_note` and `internal_note`.
- `deliveryMessage(order)` includes the customer's notes and Ali's `delivery_notes`; `deliveryWhatsAppUrl(order, company: { whatsapp: string })` opens `https://wa.me/<964...>?text=...`; `customerWhatsAppUrl(..., "update")` shows the company name when one is set.
- Order page: all six statuses always visible as buttons with the current one highlighted; choosing cancelled or returned asks first and says stock returns; choosing an active status from cancelled or returned says stock will be taken again. No copy button, no "التوصيل والملاحظات" card: a single **ملاحظات** box. A company picker (active companies, showing each company's price for this governorate and the difference from what the customer paid); the button "إرسال إلى شركة التوصيل" is disabled until a company is picked.

- [ ] **Step 1: Write failing tests** for each interface above, including: every status except the current is offered for every status; a refused reopen shows the sold-out message; delete works on a new order and refuses non-admins; assigning a company stores name and price, a company without a price for that governorate stores no cost, clearing resets all three; the delivery message has both notes and the amount to collect, and no company line when none is set; the browser tests on the dev-only order page cover the always-visible statuses, the confirmations, the disabled and enabled delivery button, the single notes box and that the copy button is gone.
- [ ] **Step 2:** Run the tests; expect FAIL. **Step 3:** Implement and update the dev-only sample order page. **Step 4:** Run all checks and Playwright; expect PASS. **Step 5: Commit** `feat: free status changes, easy delete and delivery company picker on the order page`.

### Task 4: Delivery fees tab and delivery companies tab

**Files:** Create `lib/admin/delivery.ts`, `lib/data/delivery.ts`, `app/admin/(protected)/delivery-fees/{page.tsx,actions.ts}`, `app/admin/(protected)/delivery-companies/{page.tsx,new/page.tsx,[id]/page.tsx,actions.ts}`, `components/admin/{DeliveryFeesForm,CompanyForm}.tsx`; Modify `components/admin/AdminNav.tsx`, `content/ar.ts`; Tests `lib/__tests__/delivery.test.ts`, `lib/__tests__/delivery-actions.test.ts`, `e2e/admin-delivery.spec.ts` (dev-only sample pages).

**Interfaces:**
- `validateFees(raw): Result<{ id: string; fee: number; min_order: number; is_active: boolean }[]>` (fees and minimums whole dinar, Arabic digits accepted, blank fee is 0, negative or text refused with the row named); `saveZonesAction(prev, formData): Promise<ActionState>` (one save for all governorates, admin only).
- `validateCompany(raw): Result<{ name: string; whatsapp: string; notes: string | null; is_active: boolean; prices: { zone_id: string; price: number }[] }>` (name 2 to 100; WhatsApp number normalised to `07XXXXXXXXX` and refused if it is not an Iraqi mobile; a blank price means no price and is not saved; prices whole dinar); `saveCompanyAction(id | null, prev, formData)` saves the company and its prices together (one save); `deleteCompanyAction(id)` (confirmation in the page; old orders keep the name).
- Fees tab: every governorate in a table (fee, minimum order, on/off), a "تطبيق سعر موحد على الكل" helper that fills the fee boxes before saving, one save button. Companies tab: list with name, number and on/off; add and edit form with the price table per governorate. Both tabs added to the admin menu.

- [ ] **Step 1: Write failing tests:** the validation rules above (Arabic digits, blank, negative, text, number forms of the WhatsApp number), the actions refuse non-admins and write the right rows (zones updated by id, company prices replaced as a set, blank prices not stored), deleting a company works.
- [ ] **Step 2:** Run the tests; expect FAIL. **Step 3:** Implement. **Step 4:** Browser tests on dev-only sample pages: typed values stay after an error, one save button, helper fills all fees, fits 375px; expect PASS. **Step 5: Commit** `feat: add delivery fees and delivery companies tabs`.

### Task 5: Stock page and the dashboard

**Files:** Create `app/admin/(protected)/stock/{page.tsx,actions.ts}`, `components/admin/{StockTable,StatCard}.tsx`, `lib/admin/dashboard.ts`; Modify `app/admin/(protected)/page.tsx`, `components/admin/AdminNav.tsx`, `content/ar.ts`; Tests `lib/__tests__/{stock-actions,dashboard}.test.ts`, `e2e/admin-dashboard.spec.ts` (dev-only sample pages).

**Interfaces:**
- `adjustStockAction(formData): Promise<ActionState>` (fields `product_id`, `variant_id`, `mode` = `add` | `shop_sale` | `set`, `amount` a whole number 0 to 100000; calls `adjust_stock`; `set` uses the difference from the current value; Arabic message for `NEGATIVE_STOCK`). The stock page lists every product and size with its quantity (lowest first), a coloured status (متوفر, منخفض, نفد), quick buttons "وصلت كمية", "بيع من المحل", "تعديل الرقم", and the last 20 movements with the reason, change, time and who; a box to change the low-stock level.
- `getDashboardStats(): Promise<DashboardStats | null>` with `byStatus` (all six, zeros filled in), `ordersToday`, `salesToday`, `salesMonth`, `stock: { available, low, out }`, `lowStock[]`, `bestSellers[]`; the dashboard also shows the latest 5 orders and refreshes every 30 seconds.

- [ ] **Step 1: Write failing tests:** each stock mode sends the right signed change and reason; bad amounts are refused before the database; `NEGATIVE_STOCK` is explained; non-admins are refused; `getDashboardStats` fills missing statuses with 0, returns `null` on an error, and maps every field to numbers.
- [ ] **Step 2:** Run the tests; expect FAIL. **Step 3:** Implement. **Step 4:** Browser tests on dev-only sample pages (empty and full states, 375 and 1280px); expect PASS. **Step 5: Commit** `feat: add stock page and a full dashboard`.

### Task 6: Whole-round checks and owner trial

- [ ] Run `npm test`, `npm run lint`, `npm run check:rtl`, `npm run build`, `npx playwright test`; expect all PASS.
- [ ] **Owner trial:** add a company with prices; set two delivery fees and see them at checkout; place an order (city and landmark only); in the admin switch it through all statuses in any order, cancel and reopen it and watch the stock; pick the company and send the delivery message; delete the test order from the list and watch the stock return; check the dashboard shows the right counts.
- [ ] Merge the branch into `main` only after the owner approves; push.

---

## Self-review notes
- Covers every point of the request: top bar link, phone hint, province list, city label, address box, delivery fees by hand, copyable order number, no "send details" button, easy delete, freely changing statuses, copy button removed, companies tab with prices, single notes box, full dashboard.
- Names are consistent: `restored_qty` and `set_order_status` (Task 1) drive `ALL_STATUSES` and the actions (Task 3); company and fee validators (Task 4) are used by the order page picker (Task 3) through `lib/data/delivery.ts`.
- The tracking-note and internal-note columns stay in the database (nothing destructive); only the screens change.
