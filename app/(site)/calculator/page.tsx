import type { Metadata } from "next";
import Link from "next/link";
import { LitresCalculator } from "@/components/shop/LitresCalculator";
import { ar } from "@/content/ar";

export const metadata: Metadata = { title: `${ar.calculator.title} | ${ar.siteName}` };

export default function CalculatorPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-8">
      <h1 className="text-3xl font-extrabold text-brand-900">{ar.calculator.title}</h1>
      <p className="leading-8 text-ink/80">{ar.calculator.intro}</p>
      <LitresCalculator />
      <Link href="/shop" className="inline-block rounded-full bg-brand-700 px-6 py-3 font-bold text-white hover:bg-brand-900">
        {ar.calculator.browse}
      </Link>
    </main>
  );
}
