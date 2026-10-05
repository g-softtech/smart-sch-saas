import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (process.env.REVALIDATION_TOKEN && authHeader !== `Bearer ${process.env.REVALIDATION_TOKEN}`) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { tag, tags } = body;
  
  if (tag) {
    revalidateTag(tag, "default");
  }
  if (tags && Array.isArray(tags)) {
    tags.forEach((t: string) => revalidateTag(t, "default"));
  }
  
  return NextResponse.json({ revalidated: true, now: Date.now() });
}