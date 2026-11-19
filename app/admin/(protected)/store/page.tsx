import { StoreInfoForm } from "@/components/admin/StoreInfoForm";
import { ar } from "@/content/ar";
import { getStoreSettings } from "@/lib/data/store-settings";
import { saveStoreInfoAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function StoreInfoPage() {
  const settings = await getStoreSettings();
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8">
      <h1 className="text-2xl font-extrabold text-brand-900">{ar.admin.store.title}</h1>
      <StoreInfoForm initial={settings} action={saveStoreInfoAction} />
    </main>
  );
}
