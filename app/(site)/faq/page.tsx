import { PageRoute, pageMetadata } from "@/components/pages/PageRoute";

export const dynamic = "force-dynamic";
export const generateMetadata = () => pageMetadata("faq");

export default function Page() {
  return <PageRoute slug="faq" />;
}
