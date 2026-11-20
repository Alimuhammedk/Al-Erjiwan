import Link from "next/link";
import { getMessages } from "@/lib/i18n/messages";

export default async function ProductNotFound() {
  const m = await getMessages();
  return (
    <main className="grid flex-1 place-items-center px-4 py-20 text-center">
      <div className="space-y-5">
        <h1 className="text-3xl font-extrabold text-brand-900">{m.product.notFoundTitle}</h1>
        <Link href="/shop" className="inline-block rounded-full bg-brand-700 px-6 py-3 font-bold text-white">
          {m.product.backToShop}
        </Link>
      </div>
    </main>
  );
}
