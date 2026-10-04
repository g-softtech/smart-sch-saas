import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { tag, tags } = body;
  
  if (tag) {
    revalidateTag(tag, "default");
  }
  if (tags && Array.isArray(tags)) {
    tags.forEach(t => revalidateTag(t, "default"));
  }
  
  return NextResponse.json({ revalidated: true, now: Date.now() });
}
