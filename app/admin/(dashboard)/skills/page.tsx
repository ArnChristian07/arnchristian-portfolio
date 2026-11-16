import type { Metadata } from "next";
import { SkillsEditor } from "@/components/admin/editors";

export const metadata: Metadata = { title: "Skills" };

export default function Page() {
  return <SkillsEditor />;
}
