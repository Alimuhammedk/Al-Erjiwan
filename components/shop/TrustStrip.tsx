import { ar } from "@/content/ar";

const icons = {
  delivery: "M3 7h11v9H3zM14 10h4l3 3v3h-7M7 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM17 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z",
  cod: "M3 8h18v10H3zM3 11h18M7 15h3",
  support: "M4 5h16v11H9l-5 4z",
} as const;

// Three short reassurances. Only things that are decided for the store: delivery everywhere,
// cash on delivery and WhatsApp. The guarantee is added here once the owner has chosen its wording.
export function TrustStrip({ className = "" }: { className?: string }) {
  const items = [
    ["delivery", ar.trust.delivery],
    ["cod", ar.trust.cod],
    ["support", ar.trust.support],
  ] as const;
  return (
    <ul className={`grid gap-3 sm:grid-cols-3 ${className}`}>
      {items.map(([key, label]) => (
        <li key={key} className="flex items-center gap-3 rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-brand-700" aria-hidden="true">
            <path d={icons[key]} />
          </svg>
          <span className="font-semibold text-brand-900">{label}</span>
        </li>
      ))}
    </ul>
  );
}
