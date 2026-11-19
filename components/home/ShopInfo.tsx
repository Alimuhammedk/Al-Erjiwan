import { ar } from "@/content/ar";
import type { StoreSettings } from "@/lib/store-settings";
import { storeInfo, whatsappLink } from "@/lib/store-info";

const t = ar.home.shopInfo;

// The guarantee wording, the address and opening hours (all editable in the admin), with WhatsApp and call buttons.
export function ShopInfo({ settings }: { settings: StoreSettings }) {
  const button = "inline-flex min-h-12 items-center justify-center rounded-full px-6 font-bold";
  return (
    <section className="mx-auto w-full max-w-6xl px-4 pt-12" aria-labelledby="shop-info-title">
      <h2 id="shop-info-title" className="mb-5 text-2xl font-extrabold text-brand-900">
        {t.title}
      </h2>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 rounded-2xl border border-brand-100 bg-brand-50 p-5" data-testid="guarantee">
          <h3 className="text-lg font-extrabold text-brand-900">{t.guaranteeTitle}</h3>
          <p className="whitespace-pre-line leading-8 text-ink/85">{settings.guarantee}</p>
        </div>
        <div className="space-y-4 rounded-2xl border border-brand-100 bg-paper p-5" data-testid="shop-details">
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-ink/70">{t.address}</dt>
              <dd className="font-bold text-brand-900">{settings.address}</dd>
            </div>
            {settings.hours && (
              <div>
                <dt className="text-sm text-ink/70">{t.hours}</dt>
                <dd className="font-bold text-brand-900">{settings.hours}</dd>
              </div>
            )}
          </dl>
          <div className="flex flex-wrap gap-3">
            <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className={`${button} bg-[#25D366] text-white hover:opacity-90`}>
              {t.whatsapp}
            </a>
            <a href={storeInfo.telHref} className={`${button} border-2 border-brand-700 text-brand-700 hover:bg-brand-50`}>
              {t.call}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
