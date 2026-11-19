import { notFound } from "next/navigation";
import { StoreInfoForm } from "@/components/admin/StoreInfoForm";
import { DEFAULT_STORE_SETTINGS } from "@/lib/store-settings";
import { echoSaveStore } from "./echo-actions";

// Dev-only copy of the shop-info form (real checks, nothing is saved). Remove before launch.
export default function AdminStoreHarness() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8">
      <StoreInfoForm initial={DEFAULT_STORE_SETTINGS} action={echoSaveStore} />
    </main>
  );
}
