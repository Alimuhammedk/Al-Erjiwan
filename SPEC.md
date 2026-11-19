# SPEC.md: Paint & Decor Store Website

> Edit everything in [BRACKETS]. Delete lines you don't need.
> Give this file to Claude Code and say: "Read SPEC.md and propose a build plan in plan mode. Do not write code yet."

## 1. Business
- **Store name:** [Al-Erjiwan]
- **City / delivery area:** [all Iraq]
- **What we sell:** [interior paint, exterior paint, wood finishes, wallpaper, decor items, tools]
- **Brands:** [Al-Jawhera Paints]
- **Currency:** [IQD / USD / both]
- **Languages:** [Arabic (RTL) ]
- **Contact:** WhatsApp [009647838232417] | Phone [009647838232417] | Instagram [@alerjiwan_iq9] | Address [Al-Kefil, Babil]

## 2. Goals
1. [Customers browse products and place orders online]
2. [I update prices, photos and stock myself, with no coding]
3. [Looks modern and works fast on phones, since most visitors use mobile]

## 3. Look and feel
- **Style:** [modern, clean, lots of white space, large photos]
- **Colours:** primary [#HEX], secondary [#HEX], accent [#HEX]
- **Fonts:** headings [FONT], body [FONT] (Arabic font: [Cairo / Tajawal])
- **Reference sites I like:** [[دهانات جوتن: حوّل مساحتك بألوان فائقة الجودة](https://www.jotun.com/eg-ar/decorative)], [[Professional Painting Supplies | Free Shipping $99+ | Painters Solutio — Painters Solutions](https://www.painterssolutions.com/)], [[PAINT2home online paint store: Pick a Color, Get Paint Delivered – Paint2Home: Online Paint Store for Interior & Exterior Paint Delivery](https://paint2home.com/)]
- **Animations:** [subtle fade-ins, hover zoom on product images, smooth page transitions]
- **Logo:** [included seperately]

## 4. Pages
| Page | Content | Interactive features |
|---|---|---|
| Home | Hero banner, featured categories, best sellers, offers, projects preview | Auto-sliding banner (editable from admin) |
| Shop | Product grid | Filters: category, room, finish, brand, price range; sort; search |
| Product | Photos, description, sizes (1L, 4L, 18L), price, stock | Size selector updates price; colour swatches; add to cart |
| Colour Picker | Colour palette by family | Click a colour to see a room preview, then jump to matching products |
| Gallery / Projects | Before/after photos | Image slider |
| Cart & Checkout | Items, totals, delivery details | Quantity update; order form |
| About / Contact | Story, map, form | WhatsApp button |
| Admin (private) | See section 6 | Login required |

## 5. Data (database tables)
- **products:** id, name_ar, name_en, description, category_id, brand, base_price, sale_price, stock, is_active, is_featured, created_at
- **product_variants:** id, product_id, size_label, price, stock (e.g. 1L, 4L, 18L)
- **product_images:** id, product_id, url, sort_order
- **categories:** id, name_ar, name_en, image_url, sort_order
- **colours:** id, name_ar, name_en, hex, family
- **orders:** id, customer_name, phone, address, city, notes, total, status, payment_method, created_at
- **order_items:** id, order_id, product_id, variant_id, quantity, unit_price
- **banners:** id, image_url, title, link, sort_order, is_active
- **settings:** key, value (store phone, delivery fee, etc.)

## 6. Admin panel (what I control)
- Login with email and password (only me)
- Products: add / edit / delete / hide, change **price**, **stock**, **sale price**
- Upload and reorder product images (drag and drop)
- Manage categories, colours and homepage banners
- Orders: list, view details, change status (New, Confirmed, Delivered, Cancelled)
- Settings: delivery fee, WhatsApp number, store name
- Changes appear on the live site **instantly**

## 7. Orders and payment
- **Payment methods:** [Cash on delivery / ZainCash / Qi Card]
- **Delivery:** [flat fee IQD ___ / by city ]
- **After an order:** [save to database + WhatsApp message to me + confirmation page]

## 8. Tech stack
- Next.js (App Router) + TypeScript
- Tailwind CSS + Framer Motion
- Supabase (Postgres, Auth, Storage)
- Hosting: [Netlify]
- Domain: [not purchased yet]

## 9. Build phases (do one at a time, test, then continue)
1. Project setup, design system, layout, homepage
2. Database tables, security rules, admin login
3. Admin product manager with image upload
4. Shop and product pages reading from the database
5. Cart and order flow, plus admin orders page
6. Colour picker and gallery
7. Arabic RTL, SEO, speed, mobile testing
8. Deploy, connect domain, final checks

## 10. Rules and constraints
- Mobile first, tested at 375px width
- Never hard-code prices or product text; always read from the database
- Only logged-in admins can write to the database
- Images compressed and lazy-loaded

## 11. Content I will provide
- [ ] 20+ product photos (white or neutral background)
- [ ] Product names, sizes, prices
- [x] Logo, brand colours
- [ ] About text, contact details
- [ ] Project/gallery photos

build it in a ways that can be easily trasfered to another person to have full controll