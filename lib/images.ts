/**
 * next/image can only optimize local files and hosts listed in
 * next.config.ts `images.remotePatterns` (Cloudinary). Anything else that was
 * pasted in as a URL is rendered as-is.
 */
export function isOptimizable(src: string) {
  if (src.startsWith("/")) return true;
  try {
    return new URL(src).hostname === "res.cloudinary.com";
  } catch {
    return false;
  }
}
