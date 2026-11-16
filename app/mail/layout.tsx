import type { Metadata } from "next";

// Standalone inbox for contact-form messages. Same sign-in as /admin, kept out
// of search results and never linked from the public site.
export const metadata: Metadata = {
  title: { default: "Mail", template: "%s · Mail" },
  robots: { index: false, follow: false, nocache: true },
};

export default function MailRootLayout({ children }: LayoutProps<"/mail">) {
  return <div className="min-h-screen bg-bg-alt">{children}</div>;
}
