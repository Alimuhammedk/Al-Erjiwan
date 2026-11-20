import Link from "next/link";
import { getMessages } from "@/lib/i18n/messages";

type Crumb = { label: string; href?: string };

// The last crumb is the current page and is not a link.
export async function Breadcrumbs({ items }: { items: Crumb[] }) {
  const m = await getMessages();
  return (
    <nav aria-label={m.common.breadcrumb} className="text-sm text-ink/70">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {items.map((c, i) => (
          <li key={c.label} className="flex items-center gap-2">
            {i > 0 && <span aria-hidden="true" className="inline-block ltr:-scale-x-100">›</span>}
            {c.href ? (
              <Link href={c.href} className="font-semibold text-brand-700 hover:underline">
                {c.label}
              </Link>
            ) : (
              <span aria-current="page" className="break-words font-semibold text-ink">
                {c.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
