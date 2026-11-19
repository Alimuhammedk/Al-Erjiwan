import { notFound } from "next/navigation";
import { ColourForm } from "@/components/admin/ColourForm";
import { ar } from "@/content/ar";
import { getAdminColour } from "@/lib/admin/colours-data";
import { saveColourAction } from "../actions";

export default async function EditColourPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const colour = await getAdminColour(id);
  if (!colour) notFound();
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8">
      <h1 className="text-2xl font-extrabold text-brand-900">
        {ar.admin.edit} · {colour.name_ar}
      </h1>
      <ColourForm action={saveColourAction.bind(null, id)} initial={colour} />
    </main>
  );
}
