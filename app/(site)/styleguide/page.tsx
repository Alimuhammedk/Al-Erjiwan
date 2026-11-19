import Image from "next/image";
import { ar } from "@/content/ar";
import { formatPrice } from "@/lib/format";

// Dev-only page for approving colours and type. Remove before phase 8.
const swatches = [
  ["brand-900", "bg-brand-900", "#3E1B66"],
  ["brand-700", "bg-brand-700", "#602F8A"],
  ["brand-500", "bg-brand-500", "#7F308B"],
  ["magenta-500", "bg-magenta-500", "#B64B91"],
  ["coral-500", "bg-coral-500", "#E35E7D"],
  ["orange-400", "bg-orange-400", "#F4AE69"],
  ["sun-300", "bg-sun-300", "#F6C461"],
  ["brand-100", "bg-brand-100", "#EBDDF3"],
  ["brand-50", "bg-brand-50", "#F6F0FA"],
  ["ink", "bg-ink", "#1F1530"],
];

export default function StyleGuide() {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-10 px-4 py-10">
      <Image src="/logo-icon.png" alt={ar.siteName} width={160} height={145} priority />
      <section>
        <h1 className="text-3xl font-extrabold text-brand-900">{ar.siteName}</h1>
        <p className="mt-2 text-lg text-brand-700">{ar.tagline}</p>
        <p className="mt-4 max-w-prose leading-8">
          هذا نص تجريبي لعرض الخط في الفقرات الطويلة على الهاتف وسطح المكتب. السعر: {formatPrice(25000)}
        </p>
      </section>
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {swatches.map(([name, cls, hex]) => (
          <div key={name} className="overflow-hidden rounded-xl border border-brand-100">
            <div className={`${cls} h-20`} />
            <div className="p-2 text-sm">
              <div className="font-bold">{name}</div>
              <div dir="ltr" className="text-start text-ink/70">{hex}</div>
            </div>
          </div>
        ))}
      </section>
      <section className="flex flex-wrap gap-3">
        <button className="rounded-full bg-brand-700 px-6 py-3 font-bold text-white hover:bg-brand-900">{ar.common.addToCart}</button>
        <button className="rounded-full bg-coral-500 px-6 py-3 font-bold text-white">{ar.common.whatsapp}</button>
        <button className="rounded-full border-2 border-brand-700 px-6 py-3 font-bold text-brand-700">{ar.common.viewAll}</button>
      </section>
    </main>
  );
}
