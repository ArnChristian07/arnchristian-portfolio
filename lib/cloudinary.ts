import "server-only";
import { v2 as cloudinary } from "cloudinary";

// Uploads go straight from the admin's browser to Cloudinary using a signature
// minted by a Server Action, so files never pass through (or size-limit) our
// server and the API secret never reaches the browser.

export type UploadKind = "image" | "document";

export type UploadTicket = {
  url: string;
  fields: Record<string, string>;
};

function config() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return null;
  return { cloudName, apiKey, apiSecret };
}

export const cloudinaryConfigured = () => config() !== null;

export function signUpload(kind: UploadKind): UploadTicket | null {
  const cfg = config();
  if (!cfg) return null;
  const root = process.env.CLOUDINARY_FOLDER || "portfolio";
  // PDFs are uploaded as "raw" files: Cloudinary blocks PDF delivery from the
  // image pipeline on new accounts by default.
  const resource = kind === "image" ? "image" : "raw";
  const params = {
    timestamp: Math.floor(Date.now() / 1000),
    folder: `${root}/${kind === "image" ? "images" : "documents"}`,
    use_filename: "true",
    unique_filename: "true",
  };
  const signature = cloudinary.utils.api_sign_request(params, cfg.apiSecret);
  return {
    url: `https://api.cloudinary.com/v1_1/${cfg.cloudName}/${resource}/upload`,
    fields: {
      ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
      api_key: cfg.apiKey,
      signature,
    },
  };
}
