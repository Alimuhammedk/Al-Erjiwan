import { notFound } from "next/navigation";
import { PageForm } from "@/components/admin/PageForm";
import { ar } from "@/content/ar";
import { getAdminPage } from "@/lib/admin/pages-data";
import { savePageAction } from "../actions";

export default async function EditPagePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getAdminPage(slug);
  if (!page) notFound();
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8">
      <h1 className="text-2xl font-extrabold text-brand-900">
        {ar.admin.edit} · {ar.pages[page.slug]}
      </h1>
      <PageForm page={page} action={savePageAction.bind(null, page.slug)} />
    </main>
  );
}
