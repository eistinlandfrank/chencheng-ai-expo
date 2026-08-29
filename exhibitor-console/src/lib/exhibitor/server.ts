import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { claimOrCreateBooth, getBoothByExhibitor, setUserRole, upsertUser } from "@/lib/db/queries";
import type { Booth } from "@/lib/db/schema/booths";

export interface ExhibitorContext {
  ok: true;
  userId: string;
  booth: Booth;
}
export interface ExhibitorError {
  ok: false;
  response: NextResponse;
}

/**
 * Resolve the authenticated exhibitor and their bound booth. Ensures the local
 * user row exists, promotes them to the exhibitor role, and claims/creates a
 * booth on first use so the console always has a real booth to operate on.
 */
export async function resolveExhibitor(
  request: NextRequest,
  desiredBoothId = "02",
): Promise<ExhibitorContext | ExhibitorError> {
  const auth = requireAuth(request);
  if (!auth.ok) {
    return { ok: false, response: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }

  const { user } = auth;
  await upsertUser({ id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl });

  let booth = await getBoothByExhibitor(user.id);
  if (!booth) {
    booth = await claimOrCreateBooth(user.id, desiredBoothId);
    await setUserRole(user.id, "exhibitor");
  }
  return { ok: true, userId: user.id, booth };
}
