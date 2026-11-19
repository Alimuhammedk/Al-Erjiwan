import { notFound } from "next/navigation";

// Any address that is not a page of the shop shows the shop's own "not found" page (with the header and footer).
export default function UnknownPage() {
  notFound();
}
