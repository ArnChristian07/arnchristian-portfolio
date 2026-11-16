import type { Metadata } from "next";
import { SettingsEditor } from "@/components/admin/editors";

export const metadata: Metadata = { title: "Settings" };

export default function Page() {
  return <SettingsEditor />;
}
