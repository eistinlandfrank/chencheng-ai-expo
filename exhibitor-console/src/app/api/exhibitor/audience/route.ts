import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { resolveExhibitor } from "@/lib/exhibitor/server";
import { getBoothAudience } from "@/lib/db/queries";
import { RELATION_KINDS } from "@/lib/db/schema/expo-booth-relations";

// GET /api/exhibitor/audience?kind=reserve — viewers who chose my booth.
export async function GET(request: NextRequest) {
  const ctx = await resolveExhibitor(request);
  if (!ctx.ok) return ctx.response;

  const kindParam = request.nextUrl.searchParams.get("kind");
  const kind =
    kindParam && (RELATION_KINDS as readonly string[]).includes(kindParam) ? kindParam : undefined;

  const audience = await getBoothAudience(ctx.booth.id, kind);
  return NextResponse.json({ audience });
}
