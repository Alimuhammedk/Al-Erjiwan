import Link from "next/link";
import { getMessages } from "@/lib/i18n/messages";

export default async function OrderNotFound() {
  const m = await getMessages();
  return (
    <main className="grid flex-1 place-items-center px-4 py-20 text-center">
      <div className="space-y-5">
        <h1 className="text-3xl font-extrabold text-brand-900">{m.order.notFound}</h1>
        <p className="text-ink/80">{m.order.notFoundText}</p>
        <div className="flex flex-col items-center gap-3">
          <Link href="/track" className="rounded-full bg-brand-700 px-6 py-3 font-bold text-white">
            {m.order.track}
          </Link>
          <Link href="/shop" className="font-bold text-brand-700">
            {m.order.continueShopping}
          </Link>
        </div>
      </div>
    </main>
  );
}
