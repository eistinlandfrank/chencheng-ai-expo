import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { resolveExhibitor } from "@/lib/exhibitor/server";
import { updateBoothForExhibitor, type BoothEditable } from "@/lib/db/queries";
import { BOOTH_CATEGORIES } from "@/lib/db/schema/booths";

// GET /api/exhibitor/booth — the booth bound to the authenticated exhibitor.
export async function GET(request: NextRequest) {
  const ctx = await resolveExhibitor(request);
  if (!ctx.ok) return ctx.response;
  return NextResponse.json({ booth: ctx.booth });
}

// PUT /api/exhibitor/booth — save editable content (ownership enforced in query).
export async function PUT(request: NextRequest) {
  const ctx = await resolveExhibitor(request);
  if (!ctx.ok) return ctx.response;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const data: BoothEditable = {};

  if (typeof body.name === "string") data.name = body.name.slice(0, 200);
  if (typeof body.category === "string" && (BOOTH_CATEGORIES as readonly string[]).includes(body.category))
    data.category = body.category;
  if (typeof body.intro === "string") data.intro = body.intro.slice(0, 2000);
  if (Array.isArray(body.keywords))
    data.keywords = body.keywords.filter((k): k is string => typeof k === "string").slice(0, 12);
  if (typeof body.recommendMinutes === "number" && body.recommendMinutes >= 0)
    data.recommendMinutes = Math.round(body.recommendMinutes);
  if (typeof body.imageUrl === "string") data.imageUrl = body.imageUrl;
  if (typeof body.videoUrl === "string") data.videoUrl = body.videoUrl;
  if (typeof body.ownerName === "string") data.ownerName = body.ownerName.slice(0, 100);
  if (typeof body.ownerRole === "string") data.ownerRole = body.ownerRole.slice(0, 100);
  if (typeof body.ownerOrg === "string") data.ownerOrg = body.ownerOrg.slice(0, 100);
  if (typeof body.ownerContact === "string") data.ownerContact = body.ownerContact.slice(0, 100);
  if (typeof body.zone === "string") data.zone = body.zone.slice(0, 16);

  const updated = await updateBoothForExhibitor(ctx.booth.id, ctx.userId, data);
  if (!updated) return NextResponse.json({ error: "not_owner" }, { status: 403 });
  return NextResponse.json({ booth: updated });
}
