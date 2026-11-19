# Phase 2: Admin Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (the owner chose native execution) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/admin` is reachable only by someone logged in with an email listed in the `admins` table; everyone else is sent to an Arabic login page.

**Architecture:** Supabase Auth (email and password) with session cookies via `@supabase/ssr`. The real check is `requireAdmin()`, called on the server by every admin page; it asks the database function `is_admin()` (already created in `0001_init.sql`). A `proxy.ts` only refreshes the session cookie and redirects visitors with no session (a convenience, never the only check). Public pages and admin pages get separate layouts through route groups so the admin has no shop header, footer or WhatsApp button.

**Tech Stack:** Next.js 16 (App Router, `proxy.ts`, async `cookies()`), `@supabase/ssr` (already installed), Vitest, Playwright (Edge).

**Spec:** `docs/superpowers/specs/2026-11-19-al-erjiwan-store-design.md` (sections 3, 4, 10), `SPEC.md` section 6, `CLAUDE.md` (Admin, Code rules).

## Global Constraints

- Branch `phase-2-database` (already holds the SQL migrations). Commit per task.
- Arabic only, RTL, logical CSS only (`npm run check:rtl` must pass). All wording lives in `content/ar.ts` under a new `admin` key.
- No secrets in code. Only the public `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are used; never the `service_role` key.
- Admin writes are checked on the server and by Supabase row-level security. The proxy is never the only protection (Next.js docs: authorise next to the data).
- No new libraries.
- Admin pages must not be cached or indexed: `dynamic = "force-dynamic"` and `robots: noindex`.
- Never type, store or log the owner's password. The owner logs in themselves.
- Run `npm test`, `npm run lint`, `npm run check:rtl` and `npm run build` before finishing.

## Review Focus

1. A logged-in account that is not in `admins` is denied, signed out, and never sees admin content.
2. An expired or garbage session cookie sends the visitor to login without a crash.
3. Opening `/admin` or a deeper admin URL directly without logging in redirects to `/admin/login`.
4. Empty, whitespace-only or very long (1,000+ character) email and password fields show an Arabic error, no crash.
5. The login never redirects to an address taken from the URL (no open redirect); success always goes to `/admin`.

---

### Task 1: Separate public and admin layouts

**Files:**
- Create: `app/(site)/layout.tsx`
- Move: `app/page.tsx` to `app/(site)/page.tsx`; `app/styleguide/page.tsx` to `app/(site)/styleguide/page.tsx`
- Modify: `app/layout.tsx` (keep `<html lang="ar" dir="rtl">`, Cairo font and `<body>` only)

**Interfaces:**
- Produces: `app/(site)/layout.tsx` default `SiteLayout({ children })` rendering `Header`, children, `Footer`, `WhatsAppButton` exactly as the root layout did.

- [ ] **Step 1:** Run `npx playwright test`; expect the 4 existing tests PASS (baseline).
- [ ] **Step 2:** Move the files with `git mv`, create `(site)/layout.tsx` holding the Header, Footer and WhatsAppButton markup from `app/layout.tsx`, and strip them from the root layout.
- [ ] **Step 3:** Run `npx playwright test`; expect the same 4 tests PASS (homepage unchanged). Run `npm run build`; expect routes `/` and `/styleguide` still listed.
- [ ] **Step 4: Commit** `refactor: split public and admin layouts with route groups`.

### Task 2: Server auth client and `requireAdmin`

**Files:**
- Create: `lib/supabase/auth-server.ts`, `lib/auth.ts`
- Test: `lib/__tests__/auth.test.ts`

**Interfaces:**
- Produces: `createAuthClient(): Promise<SupabaseClient>` (uses `createServerClient` from `@supabase/ssr` with the async `cookies()` from `next/headers`, `getAll` and `setAll`); `requireAdmin(): Promise<User>` where `User` is the Supabase auth user.
- Consumes: `is_admin()` database function via `supabase.rpc("is_admin")` returning a boolean.

- [ ] **Step 1: Write failing tests** in `auth.test.ts`, mocking `@/lib/supabase/auth-server` and `next/navigation` (`redirect` throws `Error("REDIRECT:" + url)`):
  - `no session`: `getUser` returns `{ data: { user: null } }`; `await expect(requireAdmin()).rejects.toThrow("REDIRECT:/admin/login")`.
  - `session error`: `getUser` returns an error; same redirect.
  - `not an admin`: user present, `rpc("is_admin")` returns `{ data: false }`; `signOut` is called once and the redirect is `/admin/login?error=forbidden`.
  - `admin`: user present, `rpc` returns `{ data: true }`; resolves to that user, `signOut` not called.
  - `rpc fails`: `rpc` returns `{ data: null, error }`; treated as not an admin (same as `not an admin`).
- [ ] **Step 2:** Run `npm test -- auth`; expect FAIL (module missing).
- [ ] **Step 3: Implement** `createAuthClient` and `requireAdmin(): Promise<User>` in the files above. Use `getUser()` (validates with the server), never `getSession()`, for the identity check.
- [ ] **Step 4:** Run `npm test`; expect all tests PASS.
- [ ] **Step 5: Commit** `feat: add server auth client and requireAdmin`.

### Task 3: Session refresh and route guard (`proxy.ts`)

**Files:**
- Create: `proxy.ts`, `lib/supabase/proxy.ts`
- Test: `lib/__tests__/proxy-guard.test.ts`

**Interfaces:**
- Produces: `updateSession(request: NextRequest): Promise<{ response: NextResponse; hasUser: boolean }>` in `lib/supabase/proxy.ts`; `proxy(request: NextRequest)` default in `proxy.ts` with `config.matcher = ["/admin/:path*"]`; pure helper `shouldRedirectToLogin(pathname: string, hasUser: boolean): boolean` exported from `lib/supabase/proxy.ts`.

- [ ] **Step 1: Write failing tests** for `shouldRedirectToLogin`: `("/admin", false) === true`, `("/admin/products", false) === true`, `("/admin/login", false) === false` (login must stay reachable), `("/admin", true) === false`, `("/admin/login", true) === false`.
- [ ] **Step 2:** Run `npm test -- proxy-guard`; expect FAIL.
- [ ] **Step 3: Implement** `shouldRedirectToLogin`, then `updateSession` (create the `@supabase/ssr` server client over the request and response cookies, call `getUser()`, return the response carrying refreshed cookies) and `proxy.ts` (redirect to `/admin/login` when `shouldRedirectToLogin`). Follow `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`.
- [ ] **Step 4:** Run `npm test`; expect PASS. Run `npm run build`; expect `ƒ Proxy (Middleware)` in the route table.
- [ ] **Step 5: Commit** `feat: add admin proxy for session refresh and redirect`.

### Task 4: Login page, sign-out and admin shell (Arabic)

**Files:**
- Create: `app/admin/login/page.tsx`, `app/admin/login/actions.ts`, `components/admin/LoginForm.tsx`, `app/admin/(protected)/layout.tsx`, `app/admin/(protected)/page.tsx`, `components/admin/AdminHeader.tsx`, `app/admin/layout.tsx`
- Modify: `content/ar.ts` (add `admin`)
- Test: `lib/__tests__/login-action.test.ts`

**Interfaces:**
- Consumes: `createAuthClient`, `requireAdmin` (Task 2).
- Produces: `type LoginState = { error: string | null }`; `signInAction(prev: LoginState, formData: FormData): Promise<LoginState>` (server action; on success calls `redirect("/admin")`); `signOutAction(): Promise<void>` (signs out then `redirect("/admin/login")`); `LoginForm()` (client, uses `useActionState`); `AdminHeader()`.
- `ar.admin` strings (exact): `loginTitle: "تسجيل دخول المدير"`, `email: "البريد الإلكتروني"`, `password: "كلمة المرور"`, `signIn: "دخول"`, `signOut: "تسجيل الخروج"`, `badCredentials: "البريد الإلكتروني أو كلمة المرور غير صحيحة"`, `forbidden: "هذا الحساب لا يملك صلاحية الدخول"`, `genericError: "حدث خطأ، حاول مرة أخرى"`, `dashboardTitle: "لوحة التحكم"`, `welcome: "مرحبًا بك في لوحة تحكم أصباغ الأرجوان"`.

- [ ] **Step 1: Write failing tests** in `login-action.test.ts` (mock `createAuthClient` and `next/navigation`):
  - empty email or empty password returns `{ error: ar.admin.badCredentials }` and never calls `signInWithPassword`.
  - an email or password over 256 characters returns `{ error: ar.admin.badCredentials }` without calling Supabase.
  - Supabase returns an auth error: returns `{ error: ar.admin.badCredentials }`.
  - Supabase succeeds but `rpc("is_admin")` is `false`: signs out and returns `{ error: ar.admin.forbidden }`.
  - Supabase succeeds and admin: `redirect("/admin")` is called (mock throws `REDIRECT:/admin`); a hidden form field named `next` with value `https://evil.example` is ignored.
- [ ] **Step 2:** Run `npm test -- login-action`; expect FAIL.
- [ ] **Step 3: Implement** `actions.ts` with the signatures above; trim the email; never log credentials.
- [ ] **Step 4:** Run `npm test`; expect PASS.
- [ ] **Step 5: Build the UI:** `app/admin/layout.tsx` sets `robots: { index: false, follow: false }` and `dynamic = "force-dynamic"`; `login/page.tsx` renders the `LoginForm` (email and password fields with labels, autocomplete attributes, an error line with `role="alert"`), plus an Arabic message when `?error=forbidden`; `(protected)/layout.tsx` calls `requireAdmin()` then renders `AdminHeader` (store name, signed-in email, sign-out button) and children; `(protected)/page.tsx` shows `dashboardTitle` and `welcome`.
- [ ] **Step 6:** Run `npm run check:rtl`, `npm run lint`, `npx tsc --noEmit`; expect no errors.
- [ ] **Step 7: Commit** `feat: add admin login, sign-out and dashboard shell`.

### Task 5: End-to-end check, owner login test and merge

**Files:**
- Create: `e2e/admin.spec.ts`

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1: Write `admin.spec.ts`** (no real credentials):
  - visiting `/admin` unauthenticated ends at `/admin/login`.
  - visiting `/admin/anything` unauthenticated ends at `/admin/login`.
  - the login page has `dir="rtl"`, shows "تسجيل دخول المدير", and has no shop header or WhatsApp button.
  - submitting `nobody@example.invalid` with a fake password shows "البريد الإلكتروني أو كلمة المرور غير صحيحة".
  - a garbage `sb-…-auth-token` cookie on `/admin` still ends at `/admin/login` with no server error.
  - no horizontal overflow at 375px on the login page.
- [ ] **Step 2:** Run `npx playwright test`; expect all tests (old and new) PASS. Save login screenshots at 375, 768 and 1280px and view them.
- [ ] **Step 3:** Run `npm test`, `npm run lint`, `npm run check:rtl`, `npm run build`; expect all PASS.
- [ ] **Step 4: Owner confirms in Supabase** that the admin user exists (Authentication > Users) and that "Allow new users to sign up" is off.
- [ ] **Step 5: Owner logs in on localhost** at `http://localhost:3000/admin/login` with the admin email and the password they set; expect the dashboard with the welcome line, then sign out returns to login.
- [ ] **Step 6: Merge** `phase-2-database` into `main` with `--no-ff` only after the owner approves; push both branches.
- [ ] **Step 7:** Summarise in 3–5 lines what changed and what the owner must test.

---

## Self-review notes
- Coverage: login with email and password, only admins in, server-side check plus row-level security, Arabic text in one file, route protection, sign-out, noindex: all covered. Admin product management is phase 3.
- Shortcut kept on purpose: `proxy.ts` only redirects and refreshes; it never decides who is an admin. `requireAdmin()` does, next to the data.
- Types: `requireAdmin` (Task 2) is consumed in Task 4; `createAuthClient` is consumed by Tasks 2 and 4; `shouldRedirectToLogin` is defined and used in Task 3 only.
