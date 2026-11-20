import { parseMapLocation } from "@/lib/maps";

// The store's map: a small embedded Google map and an "Open in Maps" button. The address comes from the owner and is
// rebuilt by parseMapLocation, so only Google Maps addresses are ever put on the page. A bad or empty link shows nothing.
export function StoreMap({ source, title, openLabel }: { source: string | null; title: string; openLabel: string }) {
  const location = source ? parseMapLocation(source) : null;
  if (!location) return null;
  return (
    <section className="space-y-3" aria-label={title} data-testid="store-map">
      <h2 className="text-xl font-extrabold text-brand-900">{title}</h2>
      {location.embedUrl && (
        <iframe
          src={location.embedUrl}
          title={title}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          sandbox="allow-scripts allow-same-origin allow-popups"
          className="h-72 w-full rounded-2xl border border-brand-100 bg-brand-50"
        />
      )}
      <a
        href={location.openUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-12 items-center rounded-full border-2 border-brand-700 px-6 font-bold text-brand-700 hover:bg-brand-50"
      >
        {openLabel}
      </a>
    </section>
  );
}
