import React from "react";
import { notFound } from "next/navigation";

async function getPageData(slug: string, pageSlug: string) {
  const url = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:3001';
  const res = await fetch(`${url}/v1/public/cms/${slug}/pages/${pageSlug}`, {
    next: { tags: [`cms-school-${slug}-page-${pageSlug}`] }
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.data || json;
}

export default async function PublicWebsiteCustomPage({
  params,
}: {
  params: Promise<{ schoolSlug: string; pageSlug: string }>;
}) {
  const { schoolSlug, pageSlug } = await params;
  const data = await getPageData(schoolSlug, pageSlug);
  if (!data) {
    notFound();
  }

  return (
    <main className="container mx-auto py-12 px-6">
      <article className="prose lg:prose-xl">
        <h1 className="text-4xl font-bold mb-8">{data.title}</h1>
        <div dangerouslySetInnerHTML={{ __html: data.content }} />
      </article>
    </main>
  );
}
