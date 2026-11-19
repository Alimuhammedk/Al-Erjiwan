import { notFound } from "next/navigation";
import { ColourForm } from "@/components/admin/ColourForm";
import { ColourImport } from "@/components/admin/ColourImport";
import { echoImport, echoPreview, echoSaveColour } from "./echo-actions";

// Dev-only copy of the colour form and the CSV import (?view=import). Remove before launch.
export default async function AdminColoursHarness({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { view } = await searchParams;
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8">
      {view === "import" ? <ColourImport preview={echoPreview} run={echoImport} /> : <ColourForm action={echoSaveColour} />}
    </main>
  );
}
