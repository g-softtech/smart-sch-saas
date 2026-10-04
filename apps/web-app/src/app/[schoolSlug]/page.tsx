import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Megaphone, Calendar, ArrowRight } from "lucide-react";

async function getSchoolData(slug: string) {
  const url = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:3001';
  const res = await fetch(`${url}/v1/public/cms/${slug}/resolve`, {
    next: { tags: [`cms-school-${slug}`] }
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.data || json;
}

async function getAnnouncements(slug: string) {
  const url = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:3001';
  const res = await fetch(`${url}/v1/public/cms/${slug}/announcements`, {
    next: { tags: [`cms-school-${slug}`] }
  });
  if (!res.ok) return [];
  const json = await res.json();
  return json.data || json;
}

async function getHomepage(slug: string) {
  const url = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:3001';
  // Try to fetch a page with slug "home"
  const res = await fetch(`${url}/v1/public/cms/${slug}/pages/home`, {
    next: { tags: [`cms-school-${slug}-home`] }
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.data || json;
}

export default async function PublicWebsiteHomepage({
  params,
}: {
  params: Promise<{ schoolSlug: string  }>;
}) {
  const { schoolSlug } = await params;
  const data = await getSchoolData(schoolSlug);
  if (!data || !data.school || !data.config) {
    notFound();
  }

  const { school, config } = data;
  const announcements = await getAnnouncements(schoolSlug);
  const homePage = await getHomepage(schoolSlug);
  
  const tp = config.themePayload || {};
  const heroImage = tp.heroImageId ? `/api/v1/media/${tp.heroImageId}` : null;

  return (
    <div className="flex flex-col w-full">
      {/* Hero Section */}
      <section 
        className="relative py-24 md:py-36 overflow-hidden flex items-center justify-center"
        style={{ 
          backgroundColor: "var(--cms-primary)", 
          backgroundImage: heroImage ? `linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0.7)), url(${heroImage})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          color: '#ffffff'
        }}
      >
        {!heroImage && (
          <div className="absolute inset-0 opacity-10">
            <div className="absolute w-96 h-96 -top-10 -left-10 bg-white rounded-full blur-3xl"></div>
            <div className="absolute w-96 h-96 -bottom-20 -right-20 bg-white rounded-full blur-3xl"></div>
          </div>
        )}
        
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 drop-shadow-md">
            Welcome to {school.name}
          </h1>
          <p className="text-lg md:text-2xl font-medium mb-10 text-slate-100 max-w-2xl mx-auto drop-shadow-sm opacity-90 leading-relaxed">
            Discover a community dedicated to academic excellence, innovation, and character building.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            {config.enableAdmissionsCta && data.admissionsToken && (
              <Link href={`/admissions/${data.admissionsToken}`} className="cms-btn cms-btn-accent px-8 py-4 text-lg w-full sm:w-auto shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all">
                Apply for Admission
              </Link>
            )}
            <Link href="#discover" className="px-8 py-4 rounded-md font-semibold border-2 border-white text-white hover:bg-white hover:text-slate-900 transition-colors w-full sm:w-auto">
              Discover More
            </Link>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div id="discover" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          
          {/* Main Page Content */}
          <div className="lg:col-span-2">
            <h2 className="text-3xl font-bold mb-8" style={{ color: "var(--cms-primary)" }}>
              {homePage ? homePage.title : "About Our School"}
            </h2>
            
            {homePage ? (
              <div 
                className="prose prose-lg max-w-none"
                dangerouslySetInnerHTML={{ __html: homePage.content }}
              />
            ) : (
              <div className="prose prose-lg max-w-none text-slate-600">
                <p>Welcome to our official website. We are committed to providing a transformative educational experience.</p>
                <p>Our dedicated faculty, modern facilities, and comprehensive curriculum empower students to succeed in a rapidly changing world.</p>
                <p>Please check back as we update our homepage content.</p>
              </div>
            )}
          </div>
          
          {/* Sidebar / Announcements */}
          <div className="space-y-8">
            <div className="bg-white p-6 rounded-xl border shadow-sm border-slate-100" style={{ borderRadius: "var(--cms-radius)" }}>
              <div className="flex items-center gap-2 mb-6 border-b pb-4">
                <Megaphone style={{ color: "var(--cms-accent)" }} />
                <h3 className="text-xl font-bold" style={{ color: "var(--cms-primary)" }}>Announcements</h3>
              </div>
              
              {announcements.length > 0 ? (
                <div className="space-y-6">
                  {announcements.slice(0, 3).map((ann: any) => (
                    <div key={ann.id} className="group">
                      <h4 className="font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors mb-2">
                        {ann.title}
                      </h4>
                      <p className="text-sm text-slate-500 line-clamp-3 mb-2">{ann.content.replace(/<[^>]+>/g, '')}</p>
                      <div className="flex items-center text-xs font-medium text-slate-400 gap-1">
                        <Calendar size={12} />
                        {new Date(ann.publishedAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                  {announcements.length > 3 && (
                    <Link href={`/${schoolSlug}/announcements`} className="inline-flex items-center text-sm font-semibold hover:underline" style={{ color: "var(--cms-primary)" }}>
                      View All Announcements <ArrowRight size={14} className="ml-1" />
                    </Link>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-500 text-center py-8 bg-slate-50 rounded-md italic">No recent announcements.</p>
              )}
            </div>
            
            {/* Quick Stats or Info Box */}
            <div 
              className="p-8 text-white flex flex-col justify-center items-center text-center shadow-md"
              style={{ backgroundColor: "var(--cms-secondary)", borderRadius: "var(--cms-radius)" }}
            >
              <h3 className="font-bold text-2xl mb-2 text-white">Join Us Today</h3>
              <p className="opacity-90 mb-6 font-medium">Take the first step towards a brighter future.</p>
              <Link href={`/admissions/${data.admissionsToken}`} className="cms-btn w-full bg-white transition-all transform hover:scale-105" style={{ color: "var(--cms-secondary)", fontWeight: 600 }}>
                Start Application
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
