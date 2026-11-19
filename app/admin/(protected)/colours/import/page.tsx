import { ColourImport } from "@/components/admin/ColourImport";
import { ar } from "@/content/ar";
import { importColoursAction, previewColourImportAction } from "../actions";

export default function ImportColoursPage() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8">
      <h1 className="text-2xl font-extrabold text-brand-900">{ar.admin.colours.importTitle}</h1>
      <ColourImport preview={previewColourImportAction} run={importColoursAction} />
    </main>
  );
}
