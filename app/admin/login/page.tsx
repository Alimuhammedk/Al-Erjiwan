import Image from "next/image";
import { LoginForm } from "@/components/admin/LoginForm";
import { ar } from "@/content/ar";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="grid flex-1 place-items-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6 rounded-2xl bg-paper p-6 shadow-sm">
        <Image src="/logo-icon.jpg" alt="" width={72} height={64} className="mx-auto h-16 w-auto" priority />
        <h1 className="text-center text-2xl font-extrabold text-brand-900">{ar.admin.loginTitle}</h1>
        <LoginForm notice={error === "forbidden" ? ar.admin.forbidden : undefined} />
      </div>
    </main>
  );
}
