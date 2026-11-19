# First prompts for Claude Code

Use these in order. Start Claude Code inside your empty project folder, with SPEC.md and CLAUDE.md in it.

## Prompt 1: Plan
Read SPEC.md and CLAUDE.md. Do not write code yet. Give me a step-by-step build plan, list any questions or missing decisions, and suggest a folder structure.

## Prompt 2: Setup
Do phase 1 from SPEC.md: create the Next.js project, set up Tailwind, fonts, colours, a header and footer with Arabic/English switching, and a homepage with placeholder content. Show me screenshots at mobile and desktop widths when done.

## Prompt 3: Database and admin login
Do phase 2: create the Supabase tables from SPEC.md section 5, add row-level security so only admins can write, and build the /admin login. Explain what I need to set up in my Supabase account, step by step.

## Prompt 4: Admin products
Do phase 3: build the admin product manager. I must be able to add, edit, hide and delete products, change prices and stock, and upload and reorder images.

## Prompt 5: Shop
Do phase 4: build the Shop page and Product page reading from the database, with filters, search, size selector that updates the price, and add to cart.

## Prompt 6: Orders
Do phase 5: build the cart, checkout form, order saving, a WhatsApp notification link, and an admin orders page with status changes.

## Prompt 7: Extras
Do phases 6 and 7: colour picker, gallery with before/after slider, Arabic RTL polish, SEO, and speed. Check everything on mobile.

## Prompt 8: Deploy
Do phase 8: walk me through pushing to GitHub, deploying to [Vercel], adding environment variables, and connecting my domain. Give me a launch checklist.

## Useful anytime
- "Review the whole site on mobile and list every visual problem, then fix them."
- "Make the homepage feel more premium. Show me 2 options before changing anything."
- "Explain what you just built in simple words."
