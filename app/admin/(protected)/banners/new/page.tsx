import { BannerForm } from "@/components/admin/BannerForm";
import { ar } from "@/content/ar";
import { saveBannerAction } from "../actions";

export default function NewBannerPage() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8">
      <h1 className="text-2xl font-extrabold text-brand-900">
        {ar.admin.add} · {ar.admin.banners.title}
      </h1>
      <BannerForm action={saveBannerAction.bind(null, null)} />
    </main>
  );
}
