
import React from "react";
import { notFound } from "next/navigation";
import { Megaphone, GraduationCap, MapPin, CheckCircle, Phone, Mail, ArrowRight } from "lucide-react";

async function getSchoolData(slug: string, preview?: string) {
  const url = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:3001';
  const fetchUrl = preview === 'true' ? `${url}/v1/public/cms/${slug}/resolve?preview=true` : `${url}/v1/public/cms/${slug}/resolve`;
  const res = await fetch(fetchUrl, { 
    next: preview === 'true' ? { revalidate: 0 } : { tags: [`school-slug-${slug}`] } 
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.data || json;
}

async function getAnnouncements(slug: string, tenantId: string, schoolId: string) {
  const url = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:3001';
  const res = await fetch(`${url}/v1/public/cms/${slug}/announcements`, { next: { tags: [`cms-site-${tenantId}-${schoolId}`] } });
  if (!res.ok) return [];
  const json = await res.json();
  return json.data || json;
}

export default async function PublicWebsiteHomepage({ params, searchParams }: { params: Promise<{ schoolSlug: string }>, searchParams: Promise<{ preview?: string }> }) {
  const { schoolSlug } = await params;
  const { preview } = await searchParams;
  const data = await getSchoolData(schoolSlug, preview);
  if (!data || !data.school || !data.config) notFound();
  const { school, config, admissionsToken } = data;
  const announcements = await getAnnouncements(schoolSlug, school.tenantId, school.id);

  const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:3001';
  const tp = config.themePayload || {};
  const sections = tp.sections || {};
  
  const heroImageUrl = tp.heroImageMediaId ? `${apiBase}/v1/public/cms/${schoolSlug}/media/${tp.heroImageMediaId}` : null;

  return (
    <div className="w-full bg-slate-50 min-h-screen text-slate-800">
      
      {/* ─── HERO SECTION ─── */}
      {sections.hero?.enabled !== false && (
        <section id="home" className="relative w-full h-[80vh] min-h-[600px] flex items-center justify-center overflow-hidden bg-slate-900">
          {heroImageUrl && (
            <div className="absolute inset-0 z-0">
              <img src={heroImageUrl} alt="Hero" className="w-full h-full object-cover opacity-50 mix-blend-overlay" />
            </div>
          )}
          <div className="relative z-10 text-center px-4 max-w-4xl mx-auto space-y-6">
            <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight drop-shadow-md">
               {sections.hero?.headline || `Welcome to ${school.name}`}
            </h1>
            <p className="text-xl md:text-2xl text-slate-200 font-medium drop-shadow">
               {sections.hero?.subheadline || "Excellence in Education"}
            </p>
            {sections.hero?.primaryCta && (
              <div className="pt-8">
                 <a href={admissionsToken ? `/admissions/${admissionsToken}` : '#admissions'} className="inline-flex items-center gap-2 px-8 py-4 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-full transition-transform hover:scale-105 shadow-xl">
                   {sections.hero.primaryCta} <ArrowRight className="w-5 h-5" />
                 </a>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ─── ABOUT SECTION ─── */}
      {sections.about?.enabled !== false && (
        <section id="about" className="py-24 px-4 bg-white">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-bold mb-12 text-center text-slate-900">{sections.about?.title || "About Us"}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
               <div className="md:col-span-3 text-lg text-slate-600 leading-relaxed max-w-4xl mx-auto text-center mb-8">
                  {sections.about?.introduction || `${school.name} is dedicated to nurturing young minds.`}
               </div>
               {sections.about?.mission && (
                 <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100 shadow-sm md:col-start-1 md:col-span-1">
                    <h3 className="text-xl font-bold mb-4 text-slate-800">Our Mission</h3>
                    <p className="text-slate-600">{sections.about.mission}</p>
                 </div>
               )}
               {sections.about?.vision && (
                 <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100 shadow-sm md:col-start-2 md:col-span-2">
                    <h3 className="text-xl font-bold mb-4 text-slate-800">Our Vision</h3>
                    <p className="text-slate-600">{sections.about.vision}</p>
                 </div>
               )}
            </div>
          </div>
        </section>
      )}

      {/* ─── WHY CHOOSE US ─── */}
      {sections.whyChooseUs?.enabled !== false && sections.whyChooseUs?.points && (
        <section id="why-choose-us" className="py-24 px-4 bg-slate-900 text-white">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-bold mb-16 text-center text-white">Why Choose Us</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
               {sections.whyChooseUs.points.split('\n').filter((p: string) => p.trim() !== '').map((point: string, idx: number) => (
                 <div key={idx} className="flex items-start gap-4 p-6 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                    <CheckCircle className="w-8 h-8 text-emerald-400 shrink-0" />
                    <p className="text-lg font-medium text-slate-200">{point.trim()}</p>
                 </div>
               ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── ACADEMICS ─── */}
      {sections.academics?.enabled !== false && sections.academics?.content && (
        <section id="academics" className="py-24 px-4 bg-slate-50">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold mb-10 text-center text-slate-900 flex items-center justify-center gap-3">
               <GraduationCap className="w-10 h-10 text-amber-500" /> Academics
            </h2>
            <div className="prose prose-lg prose-slate mx-auto whitespace-pre-line text-slate-600">
               {sections.academics.content}
            </div>
          </div>
        </section>
      )}
      
      {/* ─── SCHOOL LIFE ─── */}
      {sections.schoolLife?.enabled !== false && sections.schoolLife?.content && (
        <section id="school-life" className="py-24 px-4 bg-white">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold mb-10 text-center text-slate-900">School Life</h2>
            <div className="prose prose-lg prose-slate mx-auto whitespace-pre-line text-slate-600">
               {sections.schoolLife.content}
            </div>
          </div>
        </section>
      )}

      {/* ─── ADMISSIONS ─── */}
      {sections.admissions?.enabled !== false && (
        <section id="admissions" className="py-24 px-4 bg-emerald-900 text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent"></div>
          <div className="max-w-5xl mx-auto relative z-10 text-center">
            <h2 className="text-4xl font-bold mb-8">Admissions</h2>
            {sections.admissions?.requirements && (
              <div className="mb-8 p-8 bg-emerald-950/50 rounded-2xl backdrop-blur-sm max-w-3xl mx-auto">
                 <h3 className="text-xl font-bold mb-4 text-emerald-200">Requirements</h3>
                 <p className="whitespace-pre-line text-emerald-50/80">{sections.admissions.requirements}</p>
              </div>
            )}
            {sections.admissions?.process && (
              <div className="mb-12 p-8 bg-emerald-950/50 rounded-2xl backdrop-blur-sm max-w-3xl mx-auto">
                 <h3 className="text-xl font-bold mb-4 text-emerald-200">Application Process</h3>
                 <p className="whitespace-pre-line text-emerald-50/80">{sections.admissions.process}</p>
              </div>
            )}
            <a href={admissionsToken ? `/admissions/${admissionsToken}` : '#'} className="inline-flex items-center gap-2 px-10 py-4 bg-white text-emerald-900 font-bold rounded-full transition-transform hover:scale-105 shadow-xl text-lg">
               Apply Now <ArrowRight className="w-5 h-5" />
            </a>
          </div>
        </section>
      )}

      {/* ─── NEWS / ANNOUNCEMENTS ─── */}
      {sections.news?.enabled !== false && announcements.length > 0 && (
        <section id="news" className="py-24 px-4 bg-slate-50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-bold mb-12 text-center text-slate-900 flex items-center justify-center gap-3">
               <Megaphone className="w-10 h-10 text-indigo-500" /> Latest News
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {announcements.slice(0, 3).map((ann: any) => (
                <div key={ann.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                  <div className="text-sm font-semibold text-indigo-500 mb-3">{new Date(ann.publishedAt).toLocaleDateString()}</div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{ann.title}</h3>
                  <div className="text-slate-600 line-clamp-3 text-sm" dangerouslySetInnerHTML={{ __html: ann.content }} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── FOOTER / CONTACT ─── */}
      <footer id="contact" className="bg-slate-950 text-slate-300 py-16 px-4 border-t border-slate-900">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
           <div>
              <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                {config.logoMediaId ? <img src={`${apiBase}/v1/public/cms/${schoolSlug}/media/${config.logoMediaId}`} alt="Logo" className="w-10 h-10 rounded" /> : null}
                {school.name}
              </h3>
              <p className="text-slate-400 max-w-xs">{sections.hero?.subheadline || "Empowering the next generation."}</p>
           </div>
           
           <div>
              <h4 className="text-lg font-bold text-white mb-6">Contact Us</h4>
              <ul className="space-y-4">
                 {sections.contact?.address && (
                   <li className="flex items-start gap-3 text-slate-400">
                      <MapPin className="w-5 h-5 text-slate-500 shrink-0" />
                      <span className="whitespace-pre-line">{sections.contact.address}</span>
                   </li>
                 )}
                 {config.contactPhone && (
                   <li className="flex items-center gap-3 text-slate-400">
                      <Phone className="w-5 h-5 text-slate-500" /> {config.contactPhone}
                   </li>
                 )}
                 {config.contactEmail && (
                   <li className="flex items-center gap-3 text-slate-400">
                      <Mail className="w-5 h-5 text-slate-500" /> {config.contactEmail}
                   </li>
                 )}
              </ul>
           </div>
           
           <div>
              <h4 className="text-lg font-bold text-white mb-6">Quick Links</h4>
              <ul className="space-y-3">
                 <li><a href="#home" className="hover:text-white transition-colors">Home</a></li>
                 {sections.about?.enabled !== false && <li><a href="#about" className="hover:text-white transition-colors">About Us</a></li>}
                 {sections.academics?.enabled !== false && <li><a href="#academics" className="hover:text-white transition-colors">Academics</a></li>}
                 {sections.admissions?.enabled !== false && <li><a href="#admissions" className="hover:text-white transition-colors">Admissions</a></li>}
              </ul>
           </div>
        </div>
        <div className="max-w-6xl mx-auto mt-16 pt-8 border-t border-slate-900 text-center text-sm text-slate-600">
           &copy; {new Date().getFullYear()} {school.name}. Powered by SchoolOS.
        </div>
      </footer>

    </div>
  );
}
