import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Megaphone, Calendar, ArrowRight } from "lucide-react";

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
async function getHomepage(slug: string, tenantId: string, schoolId: string) {
  const url = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:3001';
  const res = await fetch(`${url}/v1/public/cms/${slug}/pages/home`, { next: { tags: [`cms-page-${tenantId}-${schoolId}-home`] } });
  if (!res.ok) return null;
  const json = await res.json();
  return json.data || json;
}

export default async function PublicWebsiteHomepage({ params, searchParams }: { params: Promise<{ schoolSlug: string }>, searchParams: Promise<{ preview?: string }> }) {
  const { schoolSlug } = await params;
  const { preview } = await searchParams;
  const data = await getSchoolData(schoolSlug, preview);
  if (!data || !data.school || !data.config) notFound();
  const { school, config } = data;
  const announcements = await getAnnouncements(schoolSlug, school.tenantId, school.id);
  const homePage = await getHomepage(schoolSlug, school.tenantId, school.id);

  return (
    <div className="w-full">
      {homePage ? (
         <div dangerouslySetInnerHTML={{ __html: homePage.content }} className="w-full" />
      ) : (
         <section className="py-24 text-center px-4"><h1 className="text-5xl md:text-7xl font-extrabold mb-6" style={{ color: 'var(--cms-primary)' }}>Welcome to {school.name}</h1></section>
      )}
      {announcements.length > 0 && (
        <section className="py-16 bg-slate-50 dark:bg-slate-900"><div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-10 flex items-center gap-3"><Megaphone style={{ color: 'var(--cms-accent)' }}/> Latest Announcements</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {announcements.map((a: any) => (<div key={a.id} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border"><h3 className="font-bold text-xl mb-2">{a.title}</h3><p className="text-sm opacity-80 mb-4">{new Date(a.publishedAt || a.createdAt).toLocaleDateString()}</p><p className="line-clamp-3">{a.content}</p></div>))}
          </div>
        </div></section>
      )}
    </div>
  );
}
