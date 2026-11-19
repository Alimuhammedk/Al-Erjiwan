import { redirect } from "next/navigation";

// The categories now live in the single "الفئات والبانرات" tab.
export default function CategoriesRedirect() {
  redirect("/admin/storefront");
}
