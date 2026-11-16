import type { Metadata } from "next";
import { HeroEditor } from "@/components/admin/editors";

export const metadata: Metadata = { title: "Hero & profile" };

export default function Page() {
  return <HeroEditor />;
}
