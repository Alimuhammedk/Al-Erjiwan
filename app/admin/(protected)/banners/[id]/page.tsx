import { notFound } from "next/navigation";
import { BannerForm } from "@/components/admin/BannerForm";
import { ar } from "@/content/ar";
import { createAuthClient } from "@/lib/supabase/auth-server";
import type { Banner } from "@/types/db";
import { saveBannerAction } from "../actions";

export default async function EditBannerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await createAuthClient();
  const { data } = await db.from("banners").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8">
      <h1 className="text-2xl font-extrabold text-brand-900">
        {ar.admin.edit} · {ar.admin.banners.title}
      </h1>
      <BannerForm action={saveBannerAction.bind(null, id)} initial={data as Banner} />
    </main>
  );
}
