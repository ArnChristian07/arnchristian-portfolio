import type { Content } from "@/components/admin/content";
import { feedAuthor } from "@/lib/site";

// Shared by the server page (builds it) and the client chatbot (reads it).
// Kept out of the "use client" file so the server can call toChatData().

/** Data the bot answers from: only the bits it needs, so the page sends less. */
export type ChatData = Pick<Content, "profile" | "about" | "skills" | "experience" | "certificates" | "contact"> & {
  projects: { title: string; description: string; tags: string[] }[];
  /** The blog author photo (falls back to the About photo); empty when neither is set. */
  avatar: string;
};

export function toChatData(c: Content): ChatData {
  return {
    profile: c.profile,
    about: c.about,
    skills: c.skills,
    experience: c.experience,
    certificates: c.certificates,
    contact: c.contact,
    projects: c.projects.map(({ title, description, tags }) => ({ title, description, tags })),
    avatar: feedAuthor(c).photo.trim(),
  };
}
