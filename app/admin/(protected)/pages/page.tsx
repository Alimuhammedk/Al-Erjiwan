import { redirect } from "next/navigation";

// The pages now live under the articles tab.
export default function AdminPagesPage() {
  redirect("/admin/articles");
}
