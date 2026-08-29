import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { resolveExhibitor } from "@/lib/exhibitor/server";
import { createMessage } from "@/lib/db/queries";

// POST /api/exhibitor/message — leave a message to a viewer who chose my booth.
export async function POST(request: NextRequest) {
  const ctx = await resolveExhibitor(request);
  if (!ctx.ok) return ctx.response;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const toUserId = typeof body.toUserId === "string" ? body.toUserId : "";
  const text = typeof body.body === "string" ? body.body.trim().slice(0, 1000) : "";

  if (!toUserId || !text) {
    return NextResponse.json({ error: "toUserId and body are required" }, { status: 400 });
  }

  const message = await createMessage({
    boothId: ctx.booth.id,
    fromUserId: ctx.userId,
    toUserId,
    body: text,
  });
  return NextResponse.json({ message });
}
