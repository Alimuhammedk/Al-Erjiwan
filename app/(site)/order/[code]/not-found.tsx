import Link from "next/link";
import { ar } from "@/content/ar";

export default function OrderNotFound() {
  return (
    <main className="grid flex-1 place-items-center px-4 py-20 text-center">
      <div className="space-y-5">
        <h1 className="text-3xl font-extrabold text-brand-900">{ar.order.notFound}</h1>
        <p className="text-ink/80">{ar.order.notFoundText}</p>
        <div className="flex flex-col items-center gap-3">
          <Link href="/track" className="rounded-full bg-brand-700 px-6 py-3 font-bold text-white">
            {ar.order.track}
          </Link>
          <Link href="/shop" className="font-bold text-brand-700">
            {ar.order.continueShopping}
          </Link>
        </div>
      </div>
    </main>
  );
}
