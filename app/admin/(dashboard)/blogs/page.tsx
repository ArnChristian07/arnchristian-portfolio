import type { Metadata } from "next";
import { BlogsEditor } from "@/components/admin/editors";

export const metadata: Metadata = { title: "Blogs" };

export default function Page() {
  return <BlogsEditor />;
}
