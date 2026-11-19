import Link from "next/link";
import { ar } from "@/content/ar";

const t = ar.home.calculatorBanner;

// A banner that sends customers to the paint calculator.
export function CalculatorBanner() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 pt-12">
      <div className="flex flex-col items-start gap-4 rounded-3xl bg-brand-900 p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-8" data-testid="calculator-banner">
        <div className="space-y-1">
          <h2 className="text-2xl font-extrabold">{t.title}</h2>
          <p className="max-w-xl leading-8 text-white/85">{t.text}</p>
        </div>
        <Link href="/calculator" className="inline-flex min-h-12 shrink-0 items-center rounded-full bg-sun-300 px-7 font-extrabold text-brand-900 hover:bg-white">
          {t.button}
        </Link>
      </div>
    </section>
  );
}
