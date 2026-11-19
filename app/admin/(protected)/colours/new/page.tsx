import { ColourForm } from "@/components/admin/ColourForm";
import { ar } from "@/content/ar";
import { saveColourAction } from "../actions";

export default function NewColourPage() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8">
      <h1 className="text-2xl font-extrabold text-brand-900">
        {ar.admin.add} · {ar.admin.colours.title}
      </h1>
      <ColourForm action={saveColourAction.bind(null, null)} />
    </main>
  );
}
