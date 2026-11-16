import type { Metadata } from "next";
import { InboxPage } from "@/components/admin/inbox-data";

export const metadata: Metadata = { title: "Messages" };

export default function Page() {
  return <InboxPage />;
}
