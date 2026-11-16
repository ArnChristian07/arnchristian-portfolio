import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { Toaster } from "@/components/toast";
import { getSeoContent, siteDescription, siteName } from "@/lib/seo";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const grotesk = Space_Grotesk({
  variable: "--font-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});
const mono = JetBrains_Mono({
  variable: "--font-mono-face",
  subsets: ["latin"],
  weight: ["500"],
});

export async function generateMetadata(): Promise<Metadata> {
  const { content, url } = await getSeoContent();
  const name = siteName(content);
  const title = `${name} - Web Portfolio`;
  const description = siteDescription(content);
  return {
    metadataBase: url,
    title: { default: title, template: `%s · ${name}` },
    description,
    applicationName: name,
    authors: [{ name, url }],
    creator: name,
    alternates: { canonical: "/" },
    openGraph: { type: "website", siteName: name, title, description, url: "/", locale: "en_US" },
    twitter: { card: "summary_large_image", title, description },
    robots: { index: true, follow: true, "max-image-preview": "large" },
    formatDetection: { email: false, telephone: false, address: false },
  };
}

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

// Runs during HTML parsing, before first paint. Light by default (matches the
// design); dark only when the visitor has chosen it with the toggle.
const themeScript = `(function(){try{var t=localStorage.getItem("theme");document.documentElement.setAttribute("data-theme",t==="dark"?"dark":"light")}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
      className={`${inter.variable} ${grotesk.variable} ${mono.variable} antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
