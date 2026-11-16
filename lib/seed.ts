import type { Content } from "@/components/admin/content";

// Pre-fills the admin editor until the first "Save changes" creates the
// Firestore document. It is never shown on the public site, which only renders
// what is stored in Firestore. Only real text lives here, no placeholders.

export const starterContent: Content = {
  profile: {
    name: "Kurisu",
    availability: "Open to OJT / internship roles",
    headline: "Hi, I’m Arn Christian.\nI'm a Programmer",
    tagline:
      "My love for technology and my interest in how things work make me develop applications and work on new technologies in order to become better at programming.",
  },
  about: {
    photo: "",
    heading: "A developer who likes small screens and big ideas.",
    body: [
      "I love making all sorts of ideas happen by coding, whether it is web application development, creating a mobile application, or even testing out some other project.",
      "My ideas sometimes arise out of the blue or are inspired by whatever I happen to come across. I also like gaming and watching anime. Gaming and anime may inspire my creativity and help generate ideas as well.",
      "I'm always very eager to figure out how everything works and try to create something new and cool using all that I learn.",
    ].join("\n\n"),
    stats: [],
  },
  skills: [
    { title: "Front-end", items: ["React", "Next.js", "TypeScript", "Tailwind CSS", "HTML / CSS"] },
    { title: "Mobile", items: ["React Native", "Expo", "Android"] },
    { title: "Back-end & data", items: ["Node.js", "Python", "REST APIs", "PostgreSQL"] },
    { title: "Tooling", items: ["Git / GitHub", "Vercel", "Figma", "Claude Code"] },
  ],
  projects: [
    {
      title: "KRS-32",
      status: "In progress",
      description:
        "Android-first emulator app for 32-bit handheld games, with dual-screen support on the roadmap and a landing page with one-tap download.",
      tags: ["React Native", "Android", "Next.js"],
      links: [],
      image: "",
      gallery: [],
    },
    {
      title: "Skin Analysis Prototype",
      status: "Team prototype",
      description:
        "Image-based skin analysis built with a team, exploring an embedding-similarity search approach instead of a plain prediction model.",
      tags: ["Python", "Embeddings", "React"],
      links: [],
      image: "",
      gallery: [],
    },
    {
      title: "Portfolio v1",
      status: "Live",
      description:
        "The previous version of this site — a fast, static portfolio deployed on Vercel that doubled as the reference for my ATS résumé.",
      tags: ["Next.js", "Tailwind", "Vercel"],
      links: [],
      image: "",
      gallery: [],
    },
  ],
  experience: [],
  certificates: [],
  posts: [],
  blog: { photo: "" },
  contact: { email: "", github: "", linkedin: "", resume: "" },
  site: { domain: "arnchristian.dev", accent: "#2563eb", hidden: [] },
};
