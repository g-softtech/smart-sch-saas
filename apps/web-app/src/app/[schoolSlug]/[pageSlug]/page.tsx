import React from "react";
import { notFound } from "next/navigation";

async function getPageData(schoolSlug: string, pageSlug: string) {
  const url = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:3001/api';
  const res = await fetch(`${url}/v1/public/cms/${schoolSlug}/pages/${pageSlug}`, {
    next: { tags: [`cms-school-${schoolSlug}-${pageSlug}`] }
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.data || json;
}

export default async function PublicWebsitePage({
  params,
}: {
  params: Promise<{ schoolSlug: string; pageSlug: string  }>;
}) {
  const { schoolSlug, pageSlug } = await params;
  const page = await getPageData(schoolSlug, pageSlug);
  
  if (!page) {
    notFound();
  }

  return (
    <div className="w-full">
      {/* Subtle Header */}
      <div className="py-12 border-b" style={{ backgroundColor: "var(--cms-primary)", color: "#fff" }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl md:text-5xl font-bold">{page.title}</h1>
        </div>
      </div>
      
      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <article 
          className="prose prose-lg md:prose-xl max-w-none prose-a:text-indigo-600 prose-headings:font-bold prose-img:rounded-lg"
          dangerouslySetInnerHTML={{ __html: page.content }}
        />
      </div>
    </div>
  );
}
