import { and, eq } from "drizzle-orm";
import { db } from "../client";
import { booths, type Booth } from "../schema/booths";

/** The booth bound to a given exhibitor (owner isolation lives here). */
export async function getBoothByExhibitor(exhibitorUserId: string): Promise<Booth | undefined> {
  const rows = await db
    .select()
    .from(booths)
    .where(eq(booths.exhibitorUserId, exhibitorUserId))
    .limit(1);
  return rows[0];
}

export async function getBoothById(id: string): Promise<Booth | undefined> {
  const rows = await db.select().from(booths).where(eq(booths.id, id)).limit(1);
  return rows[0];
}

export type BoothEditable = Partial<
  Pick<
    Booth,
    | "name"
    | "category"
    | "intro"
    | "keywords"
    | "recommendMinutes"
    | "imageUrl"
    | "videoUrl"
    | "ownerName"
    | "ownerRole"
    | "ownerOrg"
    | "ownerContact"
    | "zone"
  >
>;

/** Update a booth only if it belongs to this exhibitor. Returns undefined if not owned. */
export async function updateBoothForExhibitor(
  id: string,
  exhibitorUserId: string,
  data: BoothEditable,
): Promise<Booth | undefined> {
  const rows = await db
    .update(booths)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(booths.id, id), eq(booths.exhibitorUserId, exhibitorUserId)))
    .returning();
  return rows[0];
}

/**
 * Ensure the exhibitor has a booth: if they already own one, return it;
 * otherwise claim the requested booth id when it is unbound, else create a
 * fresh draft under that id. Keeps demo onboarding one-tap.
 */
export async function claimOrCreateBooth(
  exhibitorUserId: string,
  desiredId: string,
): Promise<Booth> {
  const existing = await getBoothByExhibitor(exhibitorUserId);
  if (existing) return existing;

  const target = await getBoothById(desiredId);
  if (target && !target.exhibitorUserId) {
    const rows = await db
      .update(booths)
      .set({ exhibitorUserId, updatedAt: new Date() })
      .where(and(eq(booths.id, desiredId), eq(booths.exhibitorUserId, desiredId)))
      .returning();
    if (rows[0]) return rows[0];
  }
  if (target && target.exhibitorUserId === null) {
    const rows = await db
      .update(booths)
      .set({ exhibitorUserId, updatedAt: new Date() })
      .where(eq(booths.id, desiredId))
      .returning();
    if (rows[0]) return rows[0];
  }

  const created = await db
    .insert(booths)
    .values({ id: desiredId, exhibitorUserId, status: "draft" })
    .onConflictDoNothing()
    .returning();
  if (created[0]) return created[0];

  // Race / already-taken id fallback: return whatever now belongs to us.
  const mine = await getBoothByExhibitor(exhibitorUserId);
  if (mine) return mine;
  throw new Error("booth_unavailable");
}
