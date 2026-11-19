import { CategoryForm } from "@/components/admin/CategoryForm";
import { ar } from "@/content/ar";
import { saveCategoryAction } from "../actions";

export default function NewCategoryPage() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8">
      <h1 className="text-2xl font-extrabold text-brand-900">
        {ar.admin.add} · {ar.admin.categories.title}
      </h1>
      <CategoryForm action={saveCategoryAction.bind(null, null)} />
    </main>
  );
}
