import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/ProductForm";
import type { PickableColour } from "@/components/admin/ColourPicker";
import type { Product } from "@/types/db";
import { echoAction } from "./echo-action";

// Dev-only copy of the admin product form with sample data, so it can be tried (and tested) without logging in.
// Remove before launch.
const colours: PickableColour[] = [
  { id: "00000000-0000-4003-8000-000000000001", name_ar: "أبيض ثلجي", name_en: "Snow white", code: "JW-101", hex: "#F7F7F2", family: "الأبيض" },
  { id: "00000000-0000-4003-8000-000000000002", name_ar: "كريمي", name_en: "Cream", code: "JW-102", hex: "#F3E9D2", family: "الأبيض" },
  { id: "00000000-0000-4003-8000-000000000003", name_ar: "رمادي فاتح", name_en: "Light grey", code: "JW-201", hex: "#D9D9D9", family: "الرمادي" },
  ...Array.from({ length: 70 }, (_, i) => ({
    id: `00000000-0000-4003-8000-${String(100 + i).padStart(12, "0")}`,
    name_ar: `لون تجريبي ${i + 1}`,
    name_en: null,
    code: `ZZ-${String(i + 1).padStart(3, "0")}`,
    hex: `#${((i * 3571) % 0xffffff).toString(16).padStart(6, "0")}`,
    family: null,
  })),
];
const categories = [
  { id: "00000000-0000-4001-8000-000000000001", name_ar: "دهانات داخلية" },
  { id: "00000000-0000-4001-8000-000000000002", name_ar: "دهانات خارجية" },
];

const product = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  name_ar: "بنتلايت داخلي ممتاز",
  name_en: null,
  description: null,
  category_id: categories[0].id,
  brand: "جوهرة",
  base_price: 18000,
  sale_price: null,
  stock: 35,
  is_active: true,
  is_featured: false,
  is_tintable: false,
  finish: "مطفي",
  rooms: ["المطبخ"],
  created_at: "2026-01-01",
} as Product;

export default async function AdminFormHarness({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const edit = (await searchParams).edit === "1";
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8">
      <h1 className="text-2xl font-extrabold text-brand-900">نموذج المنتج (نسخة تجريبية)</h1>
      <ProductForm
        action={echoAction}
        categories={categories}
        colours={colours}
        initial={
          edit
            ? {
                product,
                images: ["/seed/p1.png", "/seed/p1b.png"],
                variants: [
                  { id: "223e4567-e89b-12d3-a456-426614174001", size_label: "1 لتر", price: "18000", stock: "20", colour_id: colours[0].id },
                  { id: "323e4567-e89b-12d3-a456-426614174002", size_label: "4 لتر", price: "60000", stock: "15", colour_id: "" },
                ],
              }
            : undefined
        }
      />
    </main>
  );
}
