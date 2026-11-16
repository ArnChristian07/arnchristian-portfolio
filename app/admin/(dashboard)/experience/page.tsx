import type { Metadata } from "next";
import { ExperienceEditor } from "@/components/admin/editors";

export const metadata: Metadata = { title: "Experience" };

export default function Page() {
  return <ExperienceEditor />;
}
