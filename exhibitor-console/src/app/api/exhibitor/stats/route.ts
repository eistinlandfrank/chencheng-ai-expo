import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { resolveExhibitor } from "@/lib/exhibitor/server";
import { getBoothStats } from "@/lib/db/queries";

// GET /api/exhibitor/stats — aggregated "who chose me" counts + trend.
export async function GET(request: NextRequest) {
  const ctx = await resolveExhibitor(request);
  if (!ctx.ok) return ctx.response;
  const stats = await getBoothStats(ctx.booth.id);
  return NextResponse.json({ stats, booth: { id: ctx.booth.id, name: ctx.booth.name } });
}
