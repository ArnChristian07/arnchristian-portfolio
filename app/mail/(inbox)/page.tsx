import type { Metadata } from "next";
import { InboxPage } from "@/components/admin/inbox-data";

export const metadata: Metadata = { title: "Inbox" };

export default function Page() {
  return <InboxPage />;
}
