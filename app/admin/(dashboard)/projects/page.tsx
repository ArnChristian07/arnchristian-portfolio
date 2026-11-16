import type { Metadata } from "next";
import { ProjectsEditor } from "@/components/admin/editors";

export const metadata: Metadata = { title: "Projects" };

export default function Page() {
  return <ProjectsEditor />;
}
