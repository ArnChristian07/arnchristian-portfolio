import type { Metadata } from "next";
import { ContactEditor } from "@/components/admin/editors";

export const metadata: Metadata = { title: "Contact & links" };

export default function Page() {
  return <ContactEditor />;
}
