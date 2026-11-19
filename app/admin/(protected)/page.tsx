import { ar } from "@/content/ar";

export default function AdminDashboard() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <h1 className="text-3xl font-extrabold text-brand-900">{ar.admin.dashboardTitle}</h1>
      <p className="mt-3 text-lg text-brand-700">{ar.admin.welcome}</p>
    </main>
  );
}
