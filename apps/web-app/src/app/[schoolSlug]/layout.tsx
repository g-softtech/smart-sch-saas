
import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Megaphone, Calendar, ArrowRight, GraduationCap, ExternalLink, Mail, Phone, MapPin } from "lucide-react";

async function getSchoolData(slug: string) {
  const url = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:3001';
  const res = await fetch(`${url}/v1/public/cms/${slug}/resolve`, {
    next: { tags: [`school-slug-${slug}`] }
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.data || json;
}

async function getNavigation(slug: string, tenantId: string, schoolId: string) {
  const url = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:3001';
  const res = await fetch(`${url}/v1/public/cms/${slug}/navigation`, {
    next: { tags: [`cms-site-${tenantId}-${schoolId}`] }
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
  const customNavigation = await getNavigation(schoolSlug, school.tenantId, school.id);
  
  const tp = config.themePayload || {};
  const sections = tp.sections || {};
  const primary = tp.primaryColor || "#0f172a";
  const secondary = tp.secondaryColor || "#475569";
  const accent = tp.accentColor || "#f59e0b";
  const bg = tp.lightDark === "dark" ? "#020617" : "#ffffff";
  const text = tp.lightDark === "dark" ? "#f8fafc" : "#0f172a";
  
  const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:3001';
  const logoUrl = config.logoMediaId ? `${apiBase}/v1/public/cms/${schoolSlug}/media/${config.logoMediaId}` : null;

  // Generate dynamic navigation from enabled sections
  const dynamicNav = [
    { id: 'nav-home', title: 'Home', url: '#home' }
  ];
  if (sections.about?.enabled !== false) dynamicNav.push({ id: 'nav-about', title: 'About Us', url: '#about' });
  if (sections.academics?.enabled !== false) dynamicNav.push({ id: 'nav-academics', title: 'Academics', url: '#academics' });
  if (sections.admissions?.enabled !== false) dynamicNav.push({ id: 'nav-admissions', title: 'Admissions', url: '#admissions' });
  if (sections.news?.enabled !== false) dynamicNav.push({ id: 'nav-news', title: 'News', url: '#news' });
  if (sections.contact?.enabled !== false) dynamicNav.push({ id: 'nav-contact', title: 'Contact', url: '#contact' });

  // Append custom navigation (advanced mode)
  const fullNavigation = [...dynamicNav, ...customNavigation.map((n: any) => ({
      id: n.id, title: n.label, url: n.targetUrl.startsWith('/') ? `/${schoolSlug}${n.targetUrl === '/' ? '' : n.targetUrl}` : n.targetUrl
  }))];

  return (
    <div className={`min-h-screen flex flex-col theme-${schoolSlug} scroll-smooth`} style={{ backgroundColor: bg, color: text }}>
      <header className="border-b shadow-sm sticky top-0 z-50 backdrop-blur-md bg-white/90 border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-3">
              {logoUrl ? ( <img src={logoUrl} alt={`${school.name} logo`} className="h-12 w-auto object-contain" /> ) : (
                <div className="w-12 h-12 flex items-center justify-center rounded-xl shadow-sm" style={{ backgroundColor: primary, color: '#fff' }}><GraduationCap size={24} /></div>
              )}
              <Link href={`/${schoolSlug}`} className="font-bold text-xl md:text-2xl tracking-tight" style={{ color: primary }}>{school.name}</Link>
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-6 items-center">
              {fullNavigation.map((item: any) => (
                <Link key={item.id} href={item.url} className="text-sm font-semibold hover:opacity-80 transition-opacity" style={{ color: secondary }}>
                  {item.title}
                </Link>
              ))}
              {config.enableAdmissionsCta && data.admissionsToken && (
                <a href={`/admissions/${data.admissionsToken}`} className="ml-4 px-6 py-2 rounded-full font-bold text-sm shadow-sm hover:shadow transition-shadow" style={{ backgroundColor: primary, color: '#fff' }}>
                  Apply Now
                </a>
              )}
            </nav>
            
            {/* Mobile Navigation Placeholder */}
            <div className="md:hidden flex items-center">
              <button className="p-2 rounded-md hover:bg-slate-100"><span className="sr-only">Open menu</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full flex flex-col items-center">
        {children}
      </main>

    </div>
  );
}
