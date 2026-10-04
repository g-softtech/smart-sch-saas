import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GraduationCap, MapPin, Mail, Phone, ExternalLink } from "lucide-react";

async function getSchoolData(slug: string) {
  const url = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:3001/api';
  const res = await fetch(`${url}/v1/public/cms/${slug}/resolve`, {
    next: { tags: [`cms-school-${slug}`] }
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.data || json;
}

async function getNavigation(slug: string) {
  const url = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:3001/api';
  const res = await fetch(`${url}/v1/public/cms/${slug}/navigation`, {
    next: { tags: [`cms-school-${slug}`] }
  });
  if (!res.ok) return [];
  const json = await res.json();
  return json.data || json;
}

export default async function PublicWebsiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ schoolSlug: string  }>;
}) {
  const { schoolSlug } = await params;
  const data = await getSchoolData(schoolSlug);
  
  if (!data || !data.school || !data.config) {
    notFound();
  }

  const { school, config } = data;
  const navigation = await getNavigation(schoolSlug);
  
  const tp = config.themePayload || {};
  const primary = tp.primaryColor || "#0A192E"; // Deep navy
  const secondary = tp.secondaryColor || "#039771"; // Restrained teal
  const accent = tp.accentColor || "#D2AD36"; // Warm gold
  const bg = tp.lightDark === "dark" ? "#020617" : "#f8fafc"; // Off-white/dark
  const text = tp.lightDark === "dark" ? "#f8fafc" : "#0A192E";
  
  // Safe mapping for border radius
  const brMap: Record<string, string> = {
    "rounded-none": "0",
    "rounded-md": "0.375rem",
    "rounded-xl": "0.75rem",
    "rounded-full": "9999px"
  };
  const br = brMap[tp.borderRadius || "rounded-md"] || "0.375rem";

  return (
    <div className={`min-h-screen flex flex-col theme-${schoolSlug}`} style={{ backgroundColor: bg, color: text }}>
      <style dangerouslySetInnerHTML={{
        __html: `
          .theme-${schoolSlug} {
            --cms-primary: ${primary};
            --cms-secondary: ${secondary};
            --cms-accent: ${accent};
            --cms-radius: ${br};
            --font-heading: "${tp.fontHeading || 'Inter'}", sans-serif;
            --font-body: "${tp.fontBody || 'Inter'}", sans-serif;
          }
          .theme-${schoolSlug} h1, .theme-${schoolSlug} h2, .theme-${schoolSlug} h3, .theme-${schoolSlug} h4 {
            font-family: var(--font-heading);
          }
          .theme-${schoolSlug} p, .theme-${schoolSlug} span, .theme-${schoolSlug} a, .theme-${schoolSlug} li {
            font-family: var(--font-body);
          }
          .cms-btn {
            background-color: var(--cms-primary);
            color: white;
            border-radius: var(--cms-radius);
            padding: 0.5rem 1rem;
            transition: opacity 0.2s;
          }
          .cms-btn:hover {
            opacity: 0.9;
          }
          .cms-btn-accent {
            background-color: var(--cms-accent);
            color: #0f172a;
            font-weight: 600;
          }
        `
      }} />

      {/* Header */}
      <header className="border-b shadow-sm sticky top-0 z-50 backdrop-blur-md" style={{ backgroundColor: `${bg}f0`, borderColor: `${primary}20` }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-3">
              {config.logoMediaId ? (
                <img src={`/api/v1/media/${config.logoMediaId}`} alt={`${school.name} logo`} className="h-12 w-auto object-contain" />
              ) : (
                <div className="w-12 h-12 flex items-center justify-center rounded-full" style={{ backgroundColor: primary, color: '#fff' }}>
                  <GraduationCap size={24} />
                </div>
              )}
              <Link href={`/${schoolSlug}`} className="font-bold text-xl md:text-2xl tracking-tight" style={{ color: primary }}>
                {school.name}
              </Link>
            </div>
            
            <nav className="hidden md:flex space-x-8">
              {navigation.map((item: any) => (
                <Link 
                  key={item.id} 
                  href={item.url.startsWith('/') ? `/${schoolSlug}${item.url === '/' ? '' : item.url}` : item.url}
                  className="font-medium hover:text-opacity-80 transition-colors"
                  style={{ color: secondary }}
                >
                  {item.title}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-4">
              {config.enableAdmissionsCta && data.admissionsToken && (
                <Link href={`/admissions/${data.admissionsToken}`} className="cms-btn cms-btn-accent hidden sm:flex items-center gap-2 shadow-sm">
                  Apply Now <ExternalLink size={16} />
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col">
        {children}
      </main>

      {/* Footer */}
      <footer className="mt-auto py-12 border-t" style={{ backgroundColor: primary, color: '#f8fafc', borderColor: `${secondary}40` }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <GraduationCap size={24} style={{ color: accent }} />
                <h3 className="text-xl font-bold">{school.name}</h3>
              </div>
              <p className="text-slate-300 max-w-xs text-sm leading-relaxed">
                Empowering students to achieve their full potential in a supportive, innovative, and excellence-driven environment.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-lg" style={{ color: accent }}>Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href={`/${schoolSlug}`} className="hover:underline text-slate-300">Home</Link></li>
                {navigation.slice(0, 4).map((item: any) => (
                  <li key={item.id}>
                    <Link href={item.url.startsWith('/') ? `/${schoolSlug}${item.url === '/' ? '' : item.url}` : item.url} className="hover:underline text-slate-300">
                      {item.title}
                    </Link>
                  </li>
                ))}
                <li><Link href="/login" className="hover:underline text-slate-300 flex items-center gap-1">SchoolOS Portal <ExternalLink size={12}/></Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-lg" style={{ color: accent }}>Contact Us</h4>
              <ul className="space-y-3 text-sm text-slate-300">
                {config.contactEmail && (
                  <li className="flex items-center gap-2">
                    <Mail size={16} style={{ color: secondary }} />
                    <a href={`mailto:${config.contactEmail}`} className="hover:underline">{config.contactEmail}</a>
                  </li>
                )}
                {config.contactPhone && (
                  <li className="flex items-center gap-2">
                    <Phone size={16} style={{ color: secondary }} />
                    <a href={`tel:${config.contactPhone}`} className="hover:underline">{config.contactPhone}</a>
                  </li>
                )}
                <li className="flex items-start gap-2">
                  <MapPin size={16} className="mt-1 flex-shrink-0" style={{ color: secondary }} />
                  <span>Main Campus, SchoolOS District</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-700 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-slate-400">
            <p>&copy; {new Date().getFullYear()} {school.name}. All rights reserved.</p>
            <p className="mt-2 md:mt-0">Powered by <span className="font-semibold text-slate-300">SchoolOS</span></p>
          </div>
        </div>
      </footer>
    </div>
  );
}
