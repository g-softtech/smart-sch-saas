import React from "react";
import { notFound } from "next/navigation";

async function getSchoolData(slug: string) {
  const url = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:3001';
  const res = await fetch(`${url}/v1/public/cms/${slug}/resolve`, { next: { tags: [`school-slug-${slug}`] } });
  if (!res.ok) return null;
  const json = await res.json();
  return json.data || json;
}

async function getPageData(slug: string, tenantId: string, schoolId: string, pageSlug: string) {
  const url = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:3001';
  const res = await fetch(`${url}/v1/public/cms/${slug}/pages/${pageSlug}`, {
    next: { tags: [`cms-page-${tenantId}-${schoolId}-${pageSlug}`] }
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.data || json;
}

export default async function PublicWebsiteCustomPage({ params }: { params: Promise<{ schoolSlug: string; pageSlug: string }> }) {
  const { schoolSlug, pageSlug } = await params;
  const data = await getSchoolData(schoolSlug);
  if (!data || !data.school) notFound();
  
  const page = await getPageData(schoolSlug, data.school.tenantId, data.school.id, pageSlug);
  if (!page) notFound();

  return (
    <main className="container mx-auto py-12 px-6">
      <article className="prose lg:prose-xl">
        <h1 className="text-4xl font-bold mb-8">{page.title}</h1>
        <div dangerouslySetInnerHTML={{ __html: page.content }} />
      </article>
    </main>
  );
}
