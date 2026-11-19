import { redirect } from "next/navigation";

// The banners now live in the single "الفئات والبانرات" tab.
export default function BannersRedirect() {
  redirect("/admin/storefront");
}
