import type { Metadata } from "next";
import { CertificatesEditor } from "@/components/admin/editors";

export const metadata: Metadata = { title: "Certificates" };

export default function Page() {
  return <CertificatesEditor />;
}
