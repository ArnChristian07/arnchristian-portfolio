import { Suspense } from "react";
import { Chatbot } from "@/components/chatbot";
import { toChatData } from "@/lib/chat-data";
import { Hero } from "@/components/hero";
import { Nav } from "@/components/nav";
import { MotionProvider } from "@/components/reveal";
import { About, Blogs, Certificates, Contact, Experience, Footer, Projects, Skills } from "@/components/sections";
import { PortfolioSkeleton } from "@/components/skeleton";
import { getPublicContent } from "@/lib/content-store";
import { jsonLd, profileLinks, siteDescription, siteName, siteUrl } from "@/lib/seo";
import { accentStyle, feedAuthor, navLinks, visibility } from "@/lib/site";
import type { Content } from "@/components/admin/content";

/** Person + WebSite structured data, so search results can show who the site is about. */
function schema(content: Content) {
  const url = siteUrl(content);
  const name = siteName(content);
  const photo = content.about.photo.trim();
  const person = {
    "@type": "Person",
    "@id": `${url}/#person`,
    name,
    url,
    description: siteDescription(content),
    jobTitle: "Web Developer",
    image: /^https?:[/][/]/.test(photo) ? photo : undefined,
    sameAs: profileLinks(content),
    knowsAbout: content.skills.flatMap((s) => s.items).filter((i) => i.trim()).slice(0, 30),
  };
  return {
    "@context": "https://schema.org",
    "@graph": [
      person,
      { "@type": "WebSite", "@id": `${url}/#website`, url, name, publisher: { "@id": `${url}/#person` } },
    ],
  };
}

async function Portfolio() {
  const content = await getPublicContent();
  const show = visibility(content);

  return (
    <div style={accentStyle(content.site.accent)}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema(content)) }} />
      <Nav domain={content.site.domain} links={navLinks(show)} showContact={show.contact} />
      <main>
        {show.hero && <Hero profile={content.profile} contact={content.contact} showProjects={show.projects} />}
        {show.about && <About about={content.about} name={content.profile.name} />}
        {show.skills && <Skills skills={content.skills} />}
        {show.projects && <Projects projects={content.projects} github={content.contact.github} />}
        {show.experience && <Experience items={content.experience} />}
        {show.certificates && <Certificates items={content.certificates} />}
        {show.blogs && <Blogs posts={content.posts} author={feedAuthor(content)} />}
        {show.contact && <Contact contact={content.contact} />}
      </main>
      <Footer contact={content.contact} name={content.profile.name} />
      <Chatbot data={toChatData(content)} />
    </div>
  );
}

export default function Home() {
  return (
    <MotionProvider>
      <Suspense fallback={<PortfolioSkeleton />}>
        <Portfolio />
      </Suspense>
    </MotionProvider>
  );
}
