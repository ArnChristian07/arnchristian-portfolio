import type { Metadata } from "next";

// Kept out of search results and never linked from the public site.
export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin" },
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return <div className="min-h-screen bg-bg-alt">{children}</div>;
}
