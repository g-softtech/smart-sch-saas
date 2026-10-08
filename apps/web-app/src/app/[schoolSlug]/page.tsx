import React from "react";
import { notFound } from "next/navigation";
import {
  Megaphone,
  GraduationCap,
  MapPin,
  CheckCircle,
  Phone,
  Mail,
  ArrowRight,
  Calendar,
  Users,
  Image as ImageIcon,
  BookOpen,
} from "lucide-react";

async function getSchoolData(slug: string, preview?: string) {
  const url =
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
    "http://127.0.0.1:3001";
  const fetchUrl =
    preview === "true"
      ? `${url}/v1/public/cms/${slug}/resolve?preview=true`
      : `${url}/v1/public/cms/${slug}/resolve`;
  const res = await fetch(fetchUrl, {
    next:
      preview === "true"
        ? { revalidate: 0 }
        : { tags: [`school-slug-${slug}`] },
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.data || json;
}

async function getAnnouncements(
  slug: string,
  tenantId: string,
  schoolId: string,
) {
  const url =
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
    "http://127.0.0.1:3001";
  const res = await fetch(`${url}/v1/public/cms/${slug}/announcements`, {
    next: { tags: [`cms-site-${tenantId}-${schoolId}`] },
  });
  if (!res.ok) return [];
  const json = await res.json();
  return json.data || json;
}

export default async function PublicWebsiteHomepage({
  params,
  searchParams,
}: {
  params: Promise<{ schoolSlug: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { schoolSlug } = await params;
  const { preview } = await searchParams;
  const data = await getSchoolData(schoolSlug, preview);
  if (!data || !data.school || !data.config) notFound();

  const { school, config, admissionsToken, events, gallery, staff, blogPosts } =
    data;
  const announcements = await getAnnouncements(
    schoolSlug,
    school.tenantId,
    school.id,
  );

  const apiBase =
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
    "http://127.0.0.1:3001";
  const theme = config.themePayload || {};
  const layout = config.layoutPayload || {};

  // Apply theme styling dynamically
  const styleVars = {
    "--primary": theme.primaryColor || "#4f46e5",
    "--secondary": theme.secondaryColor || "#1e1e2f",
    "--bg": theme.backgroundColor || "#0f172a",
    "--text": theme.textColor || "#f8fafc",
    fontFamily: theme.fontFamily || "Inter, sans-serif",
  } as React.CSSProperties;

  // Resolve section ordering
  const orderedSections = Object.keys(layout)
    .filter((key) => layout[key]?.enabled !== false)
    .sort((a, b) => (layout[a]?.order || 99) - (layout[b]?.order || 99));

  // Determine media URLs
  const heroImageUrl = config.logoMediaId
    ? `${apiBase}/v1/public/cms/${schoolSlug}/media/${config.logoMediaId}`
    : null; // Temp fallback to logo

  return (
    <div
      className="w-full min-h-screen"
      style={{
        ...styleVars,
        backgroundColor: "var(--bg)",
        color: "var(--text)",
      }}
    >
      {orderedSections.map((sectionId) => {
        switch (sectionId) {
          case "hero":
            return (
              <section
                key="hero"
                id="hero"
                className="relative w-full h-[80vh] min-h-[600px] flex items-center justify-center overflow-hidden"
                style={{ backgroundColor: "var(--secondary)" }}
              >
                {heroImageUrl && (
                  <div className="absolute inset-0 z-0">
                    <img
                      src={heroImageUrl}
                      alt="Hero"
                      className="w-full h-full object-cover opacity-30 mix-blend-overlay"
                    />
                  </div>
                )}
                <div className="relative z-10 text-center px-4 max-w-4xl mx-auto space-y-6">
                  <h1
                    className="text-5xl md:text-7xl font-extrabold tracking-tight drop-shadow-md text-white"
                    style={{
                      fontFamily: theme.headingFontFamily || theme.fontFamily,
                    }}
                  >
                    Welcome to {school.name}
                  </h1>
                  <p className="text-xl md:text-2xl font-medium drop-shadow text-white/80">
                    Excellence in Education
                  </p>
                  {config.enableAdmissionsCta !== false && (
                    <div className="pt-8">
                      <a
                        href={
                          admissionsToken
                            ? `/admissions/${admissionsToken}`
                            : "#"
                        }
                        className="inline-flex items-center gap-2 px-8 py-4 font-bold rounded-full transition-transform hover:scale-105 shadow-xl text-white"
                        style={{ backgroundColor: "var(--primary)" }}
                      >
                        Apply Now <ArrowRight className="w-5 h-5" />
                      </a>
                    </div>
                  )}
                </div>
              </section>
            );

          case "about":
            return (
              <section
                key="about"
                id="about"
                className="py-24 px-4 bg-white text-slate-800"
              >
                <div className="max-w-6xl mx-auto">
                  <h2
                    className="text-4xl font-bold mb-12 text-center"
                    style={{
                      fontFamily: theme.headingFontFamily || theme.fontFamily,
                    }}
                  >
                    About Us
                  </h2>
                  <div className="text-lg leading-relaxed max-w-4xl mx-auto text-center mb-8">
                    {school.name} is dedicated to nurturing young minds and
                    fostering academic excellence.
                  </div>
                </div>
              </section>
            );

          case "events":
            if (!events?.length) return null;
            return (
              <section
                key="events"
                id="events"
                className="py-24 px-4"
                style={{ backgroundColor: "var(--bg)" }}
              >
                <div className="max-w-6xl mx-auto">
                  <h2
                    className="text-4xl font-bold mb-12 text-center flex items-center justify-center gap-3"
                    style={{
                      fontFamily: theme.headingFontFamily || theme.fontFamily,
                    }}
                  >
                    <Calendar
                      className="w-10 h-10"
                      style={{ color: "var(--primary)" }}
                    />{" "}
                    Upcoming Events
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {events.map((ev: any) => (
                      <div
                        key={ev.id}
                        className="rounded-2xl p-6 shadow-sm border border-slate-700/50 bg-slate-800/20"
                      >
                        <div
                          className="text-sm font-semibold mb-3"
                          style={{ color: "var(--primary)" }}
                        >
                          {new Date(ev.eventDate).toLocaleDateString()}
                        </div>
                        <h3 className="text-xl font-bold mb-3">{ev.title}</h3>
                        <p className="opacity-80 line-clamp-3">
                          {ev.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            );

          case "gallery":
            if (!gallery?.length) return null;
            return (
              <section
                key="gallery"
                id="gallery"
                className="py-24 px-4 bg-slate-900 text-white"
              >
                <div className="max-w-6xl mx-auto">
                  <h2
                    className="text-4xl font-bold mb-12 text-center flex items-center justify-center gap-3"
                    style={{
                      fontFamily: theme.headingFontFamily || theme.fontFamily,
                    }}
                  >
                    <ImageIcon
                      className="w-10 h-10"
                      style={{ color: "var(--primary)" }}
                    />{" "}
                    Gallery
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {gallery.map((item: any) => (
                      <div
                        key={item.id}
                        className="aspect-square rounded-xl overflow-hidden bg-slate-800 relative group"
                      >
                        <img
                          src={`${apiBase}/v1/public/cms/${schoolSlug}/media/${item.mediaId}`}
                          alt={item.caption || "Gallery image"}
                          className="w-full h-full object-cover transition-transform group-hover:scale-110"
                        />
                        {item.caption && (
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                            <span className="text-sm">{item.caption}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            );

          case "leadership":
            if (!staff?.length) return null;
            return (
              <section
                key="leadership"
                id="leadership"
                className="py-24 px-4 bg-white text-slate-800"
              >
                <div className="max-w-6xl mx-auto">
                  <h2
                    className="text-4xl font-bold mb-12 text-center flex items-center justify-center gap-3"
                    style={{
                      fontFamily: theme.headingFontFamily || theme.fontFamily,
                    }}
                  >
                    <Users
                      className="w-10 h-10"
                      style={{ color: "var(--primary)" }}
                    />{" "}
                    Leadership & Staff
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {staff.map((member: any) => (
                      <div key={member.id} className="text-center group">
                        <div
                          className="w-40 h-40 mx-auto rounded-full overflow-hidden mb-4 bg-slate-200 border-4"
                          style={{ borderColor: "var(--primary)" }}
                        >
                          {member.photoMediaId ? (
                            <img
                              src={`${apiBase}/v1/public/cms/${schoolSlug}/media/${member.photoMediaId}`}
                              alt={member.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Users className="w-full h-full p-8 text-slate-400" />
                          )}
                        </div>
                        <h3 className="text-xl font-bold">{member.name}</h3>
                        <p className="text-sm font-medium opacity-70 mb-2">
                          {member.role}
                        </p>
                        {member.bio && (
                          <p className="text-sm opacity-60 line-clamp-3">
                            {member.bio}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            );

          case "blog":
            if (!blogPosts?.length) return null;
            return (
              <section
                key="blog"
                id="blog"
                className="py-24 px-4"
                style={{ backgroundColor: "var(--bg)" }}
              >
                <div className="max-w-6xl mx-auto">
                  <h2
                    className="text-4xl font-bold mb-12 text-center flex items-center justify-center gap-3"
                    style={{
                      fontFamily: theme.headingFontFamily || theme.fontFamily,
                    }}
                  >
                    <BookOpen
                      className="w-10 h-10"
                      style={{ color: "var(--primary)" }}
                    />{" "}
                    Blog & News
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {blogPosts.map((post: any) => (
                      <div
                        key={post.id}
                        className="rounded-2xl overflow-hidden shadow-sm border border-slate-700/50 bg-slate-800/20 group"
                      >
                        {post.featuredMediaId && (
                          <div className="aspect-video w-full overflow-hidden">
                            <img
                              src={`${apiBase}/v1/public/cms/${schoolSlug}/media/${post.featuredMediaId}`}
                              alt={post.title}
                              className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            />
                          </div>
                        )}
                        <div className="p-6">
                          <div
                            className="text-xs font-semibold mb-2"
                            style={{ color: "var(--primary)" }}
                          >
                            {new Date(post.publishedAt).toLocaleDateString()}
                          </div>
                          <h3 className="text-xl font-bold mb-3">
                            {post.title}
                          </h3>
                          <p className="opacity-80 line-clamp-3 text-sm">
                            {post.excerpt}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            );

          case "announcements":
            if (!announcements?.length) return null;
            return (
              <section
                key="announcements"
                id="announcements"
                className="py-24 px-4 bg-slate-900 text-white"
              >
                <div className="max-w-6xl mx-auto">
                  <h2
                    className="text-4xl font-bold mb-12 text-center flex items-center justify-center gap-3"
                    style={{
                      fontFamily: theme.headingFontFamily || theme.fontFamily,
                    }}
                  >
                    <Megaphone
                      className="w-10 h-10"
                      style={{ color: "var(--primary)" }}
                    />{" "}
                    Announcements
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {announcements.slice(0, 3).map((ann: any) => (
                      <div
                        key={ann.id}
                        className="bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-700 hover:shadow-md transition-shadow"
                      >
                        <div
                          className="text-sm font-semibold mb-3"
                          style={{ color: "var(--primary)" }}
                        >
                          {new Date(ann.publishedAt).toLocaleDateString()}
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3">
                          {ann.title}
                        </h3>
                        <div
                          className="text-slate-300 line-clamp-3 text-sm"
                          dangerouslySetInnerHTML={{ __html: ann.content }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            );

          case "contact":
            return (
              <section
                key="contact"
                id="contact"
                className="py-24 px-4 bg-white text-slate-800"
              >
                <div className="max-w-4xl mx-auto text-center">
                  <h2
                    className="text-4xl font-bold mb-8"
                    style={{
                      fontFamily: theme.headingFontFamily || theme.fontFamily,
                    }}
                  >
                    Get in Touch
                  </h2>
                  <div className="flex flex-col md:flex-row justify-center items-center gap-8 md:gap-16">
                    {config.contactEmail && (
                      <a
                        href={`mailto:${config.contactEmail}`}
                        className="flex flex-col items-center gap-3 group"
                      >
                        <div
                          className="w-16 h-16 rounded-full flex items-center justify-center bg-slate-50 group-hover:bg-slate-100 transition-colors"
                          style={{ color: "var(--primary)" }}
                        >
                          <Mail className="w-8 h-8" />
                        </div>
                        <span className="font-medium">
                          {config.contactEmail}
                        </span>
                      </a>
                    )}
                    {config.contactPhone && (
                      <a
                        href={`tel:${config.contactPhone}`}
                        className="flex flex-col items-center gap-3 group"
                      >
                        <div
                          className="w-16 h-16 rounded-full flex items-center justify-center bg-slate-50 group-hover:bg-slate-100 transition-colors"
                          style={{ color: "var(--primary)" }}
                        >
                          <Phone className="w-8 h-8" />
                        </div>
                        <span className="font-medium">
                          {config.contactPhone}
                        </span>
                      </a>
                    )}
                  </div>
                </div>
              </section>
            );

          case "footer":
            return (
              <footer
                key="footer"
                id="footer"
                className="bg-slate-950 text-slate-300 py-16 px-4 border-t border-slate-900"
              >
                <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
                  <div>
                    <h3
                      className="text-2xl font-bold text-white mb-6 flex items-center gap-3"
                      style={{
                        fontFamily: theme.headingFontFamily || theme.fontFamily,
                      }}
                    >
                      {config.logoMediaId ? (
                        <img
                          src={`${apiBase}/v1/public/cms/${schoolSlug}/media/${config.logoMediaId}`}
                          alt="Logo"
                          className="w-10 h-10 rounded"
                        />
                      ) : null}
                      {school.name}
                    </h3>
                    <p className="text-slate-400 max-w-xs">
                      Empowering the next generation.
                    </p>
                  </div>

                  <div>
                    <h4 className="text-lg font-bold text-white mb-6">
                      Contact Us
                    </h4>
                    <ul className="space-y-4">
                      {config.contactPhone && (
                        <li className="flex items-center gap-3 text-slate-400">
                          <Phone className="w-5 h-5 text-slate-500" />{" "}
                          {config.contactPhone}
                        </li>
                      )}
                      {config.contactEmail && (
                        <li className="flex items-center gap-3 text-slate-400">
                          <Mail className="w-5 h-5 text-slate-500" />{" "}
                          {config.contactEmail}
                        </li>
                      )}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-lg font-bold text-white mb-6">
                      Quick Links
                    </h4>
                    <ul className="space-y-3">
                      <li>
                        <a
                          href="#hero"
                          className="hover:text-white transition-colors"
                        >
                          Home
                        </a>
                      </li>
                      <li>
                        <a
                          href="#about"
                          className="hover:text-white transition-colors"
                        >
                          About Us
                        </a>
                      </li>
                      {events?.length > 0 && (
                        <li>
                          <a
                            href="#events"
                            className="hover:text-white transition-colors"
                          >
                            Events
                          </a>
                        </li>
                      )}
                      {blogPosts?.length > 0 && (
                        <li>
                          <a
                            href="#blog"
                            className="hover:text-white transition-colors"
                          >
                            Blog
                          </a>
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
                <div className="max-w-6xl mx-auto mt-16 pt-8 border-t border-slate-900 text-center text-sm text-slate-600">
                  &copy; {new Date().getFullYear()} {school.name}. Powered by
                  SchoolOS.
                </div>
              </footer>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}
