import type { Metadata } from "next";
import { AboutEditor } from "@/components/admin/editors";

export const metadata: Metadata = { title: "About me" };

export default function Page() {
  return <AboutEditor />;
}
