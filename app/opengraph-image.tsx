import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { DEFAULT_ACCENT } from "@/components/admin/content";
import { getSeoContent, siteDescription, siteName } from "@/lib/seo";

// Link-preview card for social sites and chat apps. Child routes without their
// own image (like /blogs) reuse this one.

export const alt = "Portfolio preview with an illustration of Kurisu at a laptop";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new Response(await renderCard(), {
    headers: { "Content-Type": contentType },
  });
}

/** Rendered once and cached; saving in the admin expires it with the content. */
async function renderCard() {
  "use cache";
  const { content, url } = await getSeoContent();
  const art = await readFile(join(process.cwd(), "public/assets/ankurisu.png"));
  const accent = /^#[0-9a-f]{6}$/i.test(content.site.accent) ? content.site.accent : DEFAULT_ACCENT;
  const description = siteDescription(content);

  return await new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          background: "linear-gradient(180deg, #f2f6fd 0%, #ffffff 100%)",
          padding: "0 40px 0 80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", flex: 1, paddingRight: 24 }}>
          <div style={{ fontSize: 26, fontWeight: 600, color: accent, letterSpacing: 1 }}>
            {new URL(url).host}
          </div>
          <div style={{ display: "flex", fontSize: 76, fontWeight: 700, color: "#0f172a", marginTop: 18, lineHeight: 1.05 }}>
            {siteName(content)}
            <span style={{ color: accent }}>.</span>
          </div>
          <div style={{ fontSize: 30, color: "#475569", marginTop: 26, lineHeight: 1.4 }}>{description}</div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- rendered by ImageResponse, not the browser */}
        <img
          src={`data:image/png;base64,${art.toString("base64")}`}
          alt=""
          width={520}
          height={520}
          style={{ objectFit: "contain" }}
        />
      </div>
    ),
    size,
  ).arrayBuffer();
}
