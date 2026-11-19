import Link from "next/link";
import { getMessages } from "@/lib/i18n/messages";

// Any address on the shop that does not exist.
export default async function SiteNotFound() {
  const m = await getMessages();
  return (
    <main className="grid flex-1 place-items-center px-4 py-20 text-center">
      <div className="space-y-5">
        <h1 className="text-3xl font-extrabold text-brand-900">{m.pages.notFound}</h1>
        <p className="text-ink/80">{m.pages.notFoundText}</p>
        <Link href="/" className="inline-flex min-h-12 items-center rounded-full bg-brand-700 px-7 font-bold text-white hover:bg-brand-900">
          {m.pages.back}
        </Link>
      </div>
    </main>
  );
}
