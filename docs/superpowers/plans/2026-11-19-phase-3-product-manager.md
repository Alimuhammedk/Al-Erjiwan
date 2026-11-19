# Phase 3: Admin Product Manager Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (the owner chose native execution) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ali can add, edit, hide and delete categories, products (with sizes, colours, stock, sale price and ordered photos) and homepage banners from `/admin`, and the public homepage shows them.

**Architecture:** Each admin area has a list page and a form page. Saving goes through server actions that call `requireAdmin()`, validate input with small pure functions, then write with the admin's own Supabase session, so the database security rules are a second lock. Photos are resized and compressed in the browser, uploaded straight to the `images` storage bucket (only admins may write there), and the saved web address goes into the database by a server action.

**Tech Stack:** Next.js 16 server actions, Supabase (`@supabase/ssr` browser client for uploads), canvas for resizing (no new libraries), Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-19-al-erjiwan-store-design.md` (sections 3, 4, 10), `SPEC.md` sections 5 and 6, `CLAUDE.md`. Builds on `docs/superpowers/plans/2026-11-19-phase-2-admin-login.md` (`requireAdmin`, `createAuthClient`).

## Global Constraints

- Branch `phase-3-products`; commit per task; merge to `main` only after the owner approves.
- Arabic only, RTL, logical CSS only (`npm run check:rtl`). All wording in `content/ar.ts` under `ar.admin`. Admin pages stay `force-dynamic` and noindex.
- Every admin action starts with `await requireAdmin()` and writes through `createAuthClient()` (never the `service_role` key). Validation errors come back in Arabic.
- Prices are whole Iraqi dinar (`numeric(12,0)`). Staff may type Arabic-Indic digits (٠-٩), Arabic thousands separators (٬) or commas.
- Photos: reject non-images and files over 10 MB before resizing; output WebP, longest side at most 1600 px, quality 0.82; use `next/image` when shown.
- A tinted product (`is_tintable`) counts stock on the base paint; a ready-made product's stock lives on its variants (size and colour).
- Deleting is allowed but asks for confirmation in the page; the safer "hide" (`is_active`) is offered first.
- No new libraries. Run `npm test`, `npm run lint`, `npm run check:rtl`, `npm run build` and the Playwright suite before finishing.

## Review Focus

1. Prices typed as `٢٥٬٠٠٠`, `25,000` or `25000` all become 25000; blank, negative, decimal or text input is rejected with an Arabic message.
2. A sale price equal to or above the normal price is rejected.
3. Calling any admin action directly while logged out (or as a non-admin) changes nothing and redirects to login.
4. A non-image or 10 MB+ file is rejected before upload; a failed upload leaves the form data intact.
5. Deleting a category keeps its products (category becomes empty); deleting a product that has orders keeps the orders.

## File structure

```
lib/admin/validate.ts          parsePrice, validateProduct, validateVariant, validateCategory, validateBanner
lib/admin/types.ts             ActionState, Result
lib/images.ts                  fitWithin, compressImage, uploadImage, removeImage
lib/supabase/browser.ts        createBrowserClient wrapper (anon key, user session cookies)
components/admin/              AdminNav, FormField, SubmitButton, ImageUploader, VariantsEditor,
                               CategoryForm, ProductForm, BannerForm, DeleteButton
app/admin/(protected)/categories/{page.tsx,new/page.tsx,[id]/page.tsx,actions.ts}
app/admin/(protected)/products/{page.tsx,new/page.tsx,[id]/page.tsx,actions.ts}
app/admin/(protected)/banners/{page.tsx,new/page.tsx,[id]/page.tsx,actions.ts}
```

---

### Task 1: Validation helpers

**Files:**
- Create: `lib/admin/validate.ts`, `lib/admin/types.ts`
- Modify: `content/ar.ts` (add `ar.admin.errors`)
- Test: `lib/__tests__/validate.test.ts`

**Interfaces:**
- Produces: `type Result<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> }`; `parsePrice(input: string): number | null`; `validateProduct(raw: Record<string, FormDataEntryValue | null>): Result<ProductInput>`; `validateVariant(raw): Result<VariantInput>`; `validateCategory(raw): Result<CategoryInput>`; `validateBanner(raw): Result<BannerInput>`. Input types mirror the table columns in `types/db.ts` (without `id`, `created_at`).
- `ar.admin.errors` (exact): `required: "هذا الحقل مطلوب"`, `invalidPrice: "أدخل سعرًا صحيحًا بالدينار"`, `salePriceTooHigh: "سعر التخفيض يجب أن يكون أقل من السعر الأصلي"`, `invalidStock: "أدخل كمية صحيحة"`, `tooLong: "النص طويل جدًا"`, `invalidLink: "الرابط غير صالح"`, `invalidImage: "الملف ليس صورة صالحة"`, `imageTooBig: "حجم الصورة كبير جدًا"`, `saveFailed: "تعذر الحفظ، حاول مرة أخرى"`.

- [ ] **Step 1: Write failing tests** in `validate.test.ts`:
  - `parsePrice("25000") === 25000`, `parsePrice("25,000") === 25000`, `parsePrice("٢٥٬٠٠٠") === 25000`, `parsePrice("٢٥٠٠٠") === 25000`, `parsePrice(" 0 ") === 0`.
  - `parsePrice("")`, `"-5"`, `"12.5"`, `"abc"`, `"1e6"` all `=== null`.
  - `validateProduct` with `name_ar:"دهان أبيض", base_price:"25,000", stock:"10"` is `ok` with `base_price === 25000` and booleans `false` when absent.
  - `validateProduct` with a blank `name_ar` returns `errors.name_ar === ar.admin.errors.required`.
  - `validateProduct` with `sale_price:"25000", base_price:"25000"` returns `errors.sale_price === ar.admin.errors.salePriceTooHigh`; with `sale_price:"20000"` is ok.
  - `validateProduct` with `name_ar` of 201 characters returns `errors.name_ar === ar.admin.errors.tooLong`; `stock:"-1"` returns `errors.stock === ar.admin.errors.invalidStock`.
  - `validateVariant` requires `size_label` and a valid `price`; accepts an empty `colour_id` as `null`.
  - `validateBanner` accepts link `""` (null), `"/shop"`, `"https://example.com/x"`, and rejects `"javascript:alert(1)"` and `"//evil.com"` with `invalidLink`.
  - `validateCategory` requires `name_ar`.
- [ ] **Step 2:** Run `npm test -- validate`; expect FAIL (module missing).
- [ ] **Step 3: Implement** the functions. `parsePrice` maps Arabic-Indic digits and `٬`/`,` away then accepts only `^\d+$`. Trim all text; empty optional text becomes `null`; `category_id` and `colour_id` must be UUIDs or empty.
- [ ] **Step 4:** Run `npm test`; expect all PASS.
- [ ] **Step 5: Commit** `feat: add admin input validation`.

### Task 2: Image pipeline and uploader

**Files:**
- Create: `lib/images.ts`, `lib/supabase/browser.ts`, `components/admin/ImageUploader.tsx`
- Test: `lib/__tests__/images.test.ts`

**Interfaces:**
- Produces: `fitWithin(width: number, height: number, max: number): { width: number; height: number }`; `checkImageFile(file: { type: string; size: number }): string | null` (returns an Arabic error or `null`); `compressImage(file: File): Promise<Blob>`; `uploadImage(file: File, folder: "products" | "categories" | "banners"): Promise<string>` (returns the public URL, path `${folder}/${crypto.randomUUID()}.webp`); `removeImage(url: string): Promise<void>` (best effort); `ImageUploader({ folder, value, onChange, multiple }: { folder: ...; value: string[]; onChange: (urls: string[]) => void; multiple?: boolean })`.
- Consumes: `ar.admin.errors.invalidImage`, `imageTooBig`.

- [ ] **Step 1: Write failing tests:** `fitWithin(4000, 2000, 1600) → {1600, 800}`; `fitWithin(800, 600, 1600) → {800, 600}` (never upscales); `fitWithin(2000, 4000, 1600) → {800, 1600}`; `checkImageFile({type:"application/pdf",size:1000})` returns `ar.admin.errors.invalidImage`; `checkImageFile({type:"image/png",size:11*1024*1024})` returns `imageTooBig`; `checkImageFile({type:"image/jpeg",size:2*1024*1024})` returns `null`.
- [ ] **Step 2:** Run `npm test -- images`; expect FAIL.
- [ ] **Step 3: Implement** `fitWithin`, `checkImageFile`, then `compressImage` (draw to canvas, `toBlob("image/webp", 0.82)`), `uploadImage` and `removeImage` with the browser client and bucket `images`.
- [ ] **Step 4: Build `ImageUploader`:** file picker (accept images, multiple when set), thumbnails via `next/image`, remove button per image, up and down buttons to reorder, Arabic error line, disabled state while uploading. It holds only URLs; saving happens in the parent form.
- [ ] **Step 5:** Run `npm test`, `npm run lint`, `npx tsc --noEmit`; expect PASS.
- [ ] **Step 6: Commit** `feat: add image compression and uploader`.

### Task 3: Admin navigation and categories

**Files:**
- Create: `components/admin/AdminNav.tsx`, `FormField.tsx`, `SubmitButton.tsx`, `DeleteButton.tsx`, `CategoryForm.tsx`; `app/admin/(protected)/categories/{page.tsx,new/page.tsx,[id]/page.tsx,actions.ts}`; `lib/admin/types.ts` (if not yet)
- Modify: `components/admin/AdminHeader.tsx` (render `AdminNav`), `app/admin/(protected)/page.tsx` (links), `content/ar.ts`
- Test: `lib/__tests__/category-actions.test.ts`

**Interfaces:**
- Produces: `type ActionState = { errors?: Record<string, string>; error?: string }`; `saveCategoryAction(id: string | null, prev: ActionState, formData: FormData): Promise<ActionState>` (create when `id` is null; on success `redirect("/admin/categories")`); `deleteCategoryAction(id: string): Promise<void>`.
- Consumes: `requireAdmin`, `createAuthClient`, `validateCategory`.
- Arabic labels added to `ar.admin`: `nav: { dashboard: "الرئيسية", products: "المنتجات", categories: "الفئات", banners: "البانرات" }`, `add: "إضافة"`, `edit: "تعديل"`, `delete: "حذف"`, `confirmDelete: "هل أنت متأكد من الحذف؟ لا يمكن التراجع"`, `save: "حفظ"`, `cancel: "إلغاء"`, `categories: { title: "الفئات", nameAr: "الاسم بالعربية", nameEn: "الاسم بالإنجليزية (اختياري)", image: "الصورة", order: "الترتيب", empty: "لا توجد فئات بعد" }`.

- [ ] **Step 1: Write failing tests** (mock `requireAdmin`, `createAuthClient`, `next/navigation`): a valid form calls `insert` once and redirects to `/admin/categories`; an invalid form (blank `name_ar`) returns `errors.name_ar` and never calls `insert`; `requireAdmin` rejecting stops the action before any database call; `deleteCategoryAction` calls `delete` with `eq("id", id)` after `requireAdmin`.
- [ ] **Step 2:** Run `npm test -- category-actions`; expect FAIL.
- [ ] **Step 3: Implement** the actions and the pages: list with image, name, order, edit and delete; form with name fields, `ImageUploader` (single), and sort order.
- [ ] **Step 4:** Add `AdminNav` (links to the three areas, current page highlighted) to the admin header.
- [ ] **Step 5:** Run `npm test`, `npm run check:rtl`, `npm run lint`, `npx tsc --noEmit`; expect PASS.
- [ ] **Step 6: Commit** `feat: add admin categories`.

### Task 4: Products list and form (basics)

**Files:**
- Create: `components/admin/ProductForm.tsx`; `app/admin/(protected)/products/{page.tsx,new/page.tsx,[id]/page.tsx,actions.ts}`
- Modify: `content/ar.ts`
- Test: `lib/__tests__/product-actions.test.ts`

**Interfaces:**
- Produces: `saveProductAction(id: string | null, prev: ActionState, formData: FormData): Promise<ActionState>`; `toggleProductActiveAction(id: string, active: boolean): Promise<void>`; `deleteProductAction(id: string): Promise<void>`. On a successful create it redirects to `/admin/products/<new id>` so photos and sizes can be added next.
- Consumes: `validateProduct`, `requireAdmin`, `createAuthClient`, `ImageUploader` (Task 5 adds it to this form).
- `ar.admin.products` labels (exact): `title: "المنتجات"`, `nameAr: "الاسم بالعربية"`, `nameEn: "الاسم بالإنجليزية (اختياري)"`, `description: "الوصف"`, `category: "الفئة"`, `brand: "العلامة التجارية"`, `basePrice: "السعر (د.ع)"`, `salePrice: "سعر التخفيض (د.ع)"`, `stock: "الكمية المتوفرة"`, `active: "ظاهر في المتجر"`, `featured: "منتج مميز (يظهر في الأكثر مبيعًا)"`, `tintable: "دهان يُخلط حسب اللون المطلوب"`, `hide: "إخفاء"`, `show: "إظهار"`, `empty: "لا توجد منتجات بعد"`.

- [ ] **Step 1: Write failing tests:** valid create inserts and redirects to `/admin/products/<id>`; invalid price returns `errors.base_price` and does not insert; update calls `update(...).eq("id", id)`; `toggleProductActiveAction` updates only `is_active`; every action rejects when `requireAdmin` rejects, before touching the database.
- [ ] **Step 2:** Run `npm test -- product-actions`; expect FAIL.
- [ ] **Step 3: Implement** actions and pages: list (name, category, price, stock, hidden badge, hide or show, edit, delete); form with all fields from the Interfaces labels, category dropdown loaded from the database, and the three switches.
- [ ] **Step 4:** Run `npm test`, `npm run check:rtl`, `npm run lint`, `npx tsc --noEmit`; expect PASS.
- [ ] **Step 5: Commit** `feat: add admin products list and form`.

### Task 5: Product photos and sizes

**Files:**
- Create: `components/admin/VariantsEditor.tsx`
- Modify: `components/admin/ProductForm.tsx`, `app/admin/(protected)/products/actions.ts`, `app/admin/(protected)/products/[id]/page.tsx`, `content/ar.ts`
- Test: `lib/__tests__/product-extras.test.ts`

**Interfaces:**
- Produces: `saveProductImagesAction(productId: string, urls: string[]): Promise<ActionState>` (replaces the product's `product_images` rows with `sort_order` 0..n-1 in the given order); `saveVariantsAction(productId: string, rows: VariantInput[]): Promise<ActionState>` (replaces the product's `product_variants`); `VariantsEditor({ value, colours, onChange })` with rows of size label, optional colour, price, stock.
- Consumes: `validateVariant`, `ImageUploader` (multiple), colours loaded from the `colours` table (may be empty until phase 6).
- Labels: `ar.admin.products.photos: "الصور (الأولى هي الصورة الرئيسية)"`, `sizes: "الأحجام والأسعار"`, `addSize: "إضافة حجم"`, `sizeLabel: "الحجم (مثل 4 لتر)"`, `colour: "اللون (اختياري)"`.

- [ ] **Step 1: Write failing tests:** `saveProductImagesAction` writes `sort_order` equal to array position and removes rows not in the list; an invalid variant row (blank size) returns `errors` and writes nothing; both actions reject when `requireAdmin` rejects; an empty image list clears the product's images.
- [ ] **Step 2:** Run `npm test -- product-extras`; expect FAIL.
- [ ] **Step 3: Implement** both actions and wire `ImageUploader` and `VariantsEditor` into the product edit page. Remove deleted photos from storage best effort.
- [ ] **Step 4:** Run `npm test`, `npm run check:rtl`, `npm run lint`, `npx tsc --noEmit`; expect PASS.
- [ ] **Step 5: Commit** `feat: add product photos and sizes`.

### Task 6: Banners

**Files:**
- Create: `components/admin/BannerForm.tsx`; `app/admin/(protected)/banners/{page.tsx,new/page.tsx,[id]/page.tsx,actions.ts}`
- Modify: `content/ar.ts`
- Test: `lib/__tests__/banner-actions.test.ts`

**Interfaces:**
- Produces: `saveBannerAction(id: string | null, prev: ActionState, formData: FormData): Promise<ActionState>`; `deleteBannerAction(id: string): Promise<void>`.
- Labels: `ar.admin.banners: { title: "البانرات", image: "الصورة", titleField: "العنوان (اختياري)", link: "الرابط (اختياري)", active: "ظاهر", order: "الترتيب", empty: "لا توجد بانرات بعد" }`.

- [ ] **Step 1: Write failing tests:** a banner without an image returns `errors.image_url`; link `javascript:alert(1)` returns `errors.link` and does not insert; a valid banner inserts and redirects to `/admin/banners`; actions reject when `requireAdmin` rejects.
- [ ] **Step 2:** Run `npm test -- banner-actions`; expect FAIL.
- [ ] **Step 3: Implement** actions, list (preview, title, active, order) and form with a single `ImageUploader`.
- [ ] **Step 4:** Run `npm test`, `npm run check:rtl`, `npm run lint`, `npx tsc --noEmit`; expect PASS.
- [ ] **Step 5: Commit** `feat: add admin banners`.

### Task 7: Checks, owner trial and merge

**Files:**
- Create: `e2e/admin-protected.spec.ts`

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1: Write `admin-protected.spec.ts`** (no login): `/admin/products`, `/admin/products/new`, `/admin/categories`, `/admin/banners` each end at `/admin/login`.
- [ ] **Step 2:** Run `npx playwright test`; expect all PASS. Run `npm test`, `npm run lint`, `npm run check:rtl`, `npm run build`; expect PASS.
- [ ] **Step 3: Owner trial on localhost** (logged in): create a category with a photo; create a product, type its price as `٢٥٬٠٠٠`, add two photos, reorder them, add sizes 1 لتر, 4 لتر, 18 لتر with prices; mark it featured; add a banner. Open `http://localhost:3000`: the banner slider, the category and the product appear. Hide the product and refresh: it disappears. Check the same screens at 375px on a phone.
- [ ] **Step 4:** Fix anything found; re-run Step 2.
- [ ] **Step 5: Merge** `phase-3-products` into `main` with `--no-ff` only after the owner approves; push both branches.
- [ ] **Step 6:** Summarise in 3–5 lines what changed and what the owner must test.

---

## Self-review notes
- Coverage: products, prices, stock, sale price, images with drag-order (as up and down buttons, a deliberate change from drag-and-drop for phone use and no new library), categories, banners, the tinted or ready-made flag, server-side checks with row-level security as the second lock. Colours management and the CSV import are phase 6; delivery fees and settings screens are phase 5.
- Types: `ActionState`, `Result`, `ProductInput`, `VariantInput` are defined in Tasks 1 and 3 and used in 3, 4, 5 and 6; action names are used only where defined.
- Shortcut kept on purpose: the first photo is the main one; there is no separate "main photo" field.
