-- English text for articles, banners and product descriptions, and the four pages (About, FAQ, Return policy, Privacy).
-- Paste this whole file into Supabase > SQL Editor > New query > Run (once). Then run supabase/tests/0009_languages_and_pages_test.sql.

alter table public.articles
  add column title_en text check (length(title_en) <= 150),
  add column excerpt_en text check (length(excerpt_en) <= 300),
  add column body_en text check (length(body_en) <= 20000);
alter table public.banners add column title_en text check (length(title_en) <= 200);
alter table public.products add column description_en text check (length(description_en) <= 5000);

create table public.site_pages (
  slug text primary key check (slug in ('about', 'faq', 'returns', 'privacy')),
  title_ar text not null default '' check (length(title_ar) <= 150),
  title_en text not null default '' check (length(title_en) <= 150),
  body_ar text not null default '' check (length(body_ar) <= 20000),
  body_en text not null default '' check (length(body_en) <= 20000),
  map_url text check (length(map_url) <= 1000),
  updated_at timestamptz not null default now()
);

create function public.site_pages_touch() returns trigger language plpgsql as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end $$;
create trigger site_pages_touch before update on public.site_pages for each row execute function public.site_pages_touch();

alter table public.site_pages enable row level security;
create policy "public read" on public.site_pages for select using (true);
create policy "admin all" on public.site_pages for all using (public.is_admin()) with check (public.is_admin());
grant select on public.site_pages to anon;
grant select, insert, update, delete on public.site_pages to authenticated;

-- Starter wording. The owner reads it and changes it in the admin (the return policy and privacy text are his decisions).
insert into public.site_pages (slug, title_ar, title_en, body_ar, body_en) values
  ('about', 'من نحن', 'About us',
   E'أصباغ الأرجوان متجر للدهانات ومواد الطلاء والديكور في الكفل، بابل. نوفّر دهانات داخلية وخارجية بألوان متعددة، وأدوات الطلاء، ونوصّل طلباتك إلى جميع محافظات العراق مع الدفع عند الاستلام.\n\nفريقنا جاهز لمساعدتك في اختيار الدهان واللون والكمية المناسبة لمشروعك. تواصل معنا عبر واتساب في أي وقت.',
   E'Al-Erjiwan is a paint and decor shop in Al-Kifl, Babil. We offer interior and exterior paints in many colours, painting tools, and delivery to every governorate in Iraq with cash on delivery.\n\nOur team is ready to help you choose the right paint, colour and quantity for your project. Message us on WhatsApp any time.'),
  ('faq', 'الأسئلة الشائعة', 'Frequently asked questions',
   E'كيف أطلب؟\nاختر المنتج واللون والحجم، أضفه إلى السلة، ثم أكمل بيانات التوصيل. سنتواصل معك عبر واتساب لتأكيد الطلب.\n\nكيف أدفع؟\nالدفع نقدًا عند الاستلام.\n\nكم تبلغ رسوم التوصيل؟\nتختلف حسب المحافظة، وتظهر في صفحة إتمام الطلب قبل التأكيد.\n\nهل أستطيع تتبع طلبي؟\nنعم، من صفحة تتبع الطلب باستخدام رقم الطلب ورقم هاتفك.\n\nكم لترًا من الدهان أحتاج؟\nاستخدم حاسبة الدهان في الموقع للحصول على تقدير سريع.',
   E'How do I order?\nChoose the product, colour and size, add it to the cart, then fill in your delivery details. We will contact you on WhatsApp to confirm the order.\n\nHow do I pay?\nCash on delivery.\n\nHow much is delivery?\nIt depends on the governorate and is shown on the checkout page before you confirm.\n\nCan I track my order?\nYes, on the order tracking page with your order number and phone number.\n\nHow many litres of paint do I need?\nUse the paint calculator on the website for a quick estimate.'),
  ('returns', 'سياسة الإرجاع', 'Return policy',
   E'إذا وصلك المنتج تالفًا أو مختلفًا عمّا طلبت، تواصل معنا فور استلامه مع صورة للمنتج، وسنعالج الأمر معك.\n\nالدهان المخلوط حسب اللون المطلوب لا يمكن إرجاعه إلا إذا كان فيه عيب في المنتج نفسه.',
   E'If your product arrives damaged or different from what you ordered, contact us as soon as you receive it with a photo, and we will sort it out with you.\n\nPaint mixed to a requested colour can only be returned if the product itself is faulty.'),
  ('privacy', 'سياسة الخصوصية', 'Privacy policy',
   E'نجمع فقط المعلومات اللازمة لتنفيذ طلبك: الاسم ورقم الهاتف وعنوان التوصيل وتفاصيل الطلب. نستخدمها للتواصل معك وتوصيل طلبك فقط، ولا نبيعها ولا نشاركها مع أي جهة سوى شركة التوصيل عند الحاجة.\n\nللاستفسار أو لطلب حذف بياناتك تواصل معنا عبر واتساب.',
   E'We only collect the information needed to fulfil your order: your name, phone number, delivery address and order details. We use it only to contact you and deliver your order, and we never sell it or share it with anyone except the delivery company when needed.\n\nTo ask a question or to have your data deleted, message us on WhatsApp.');
