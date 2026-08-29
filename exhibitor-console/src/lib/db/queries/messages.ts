import { and, desc, eq } from "drizzle-orm";
import { db } from "../client";
import { exhibitorMessages, type ExhibitorMessage } from "../schema/exhibitor-messages";

export async function createMessage(data: {
  boothId: string;
  fromUserId: string;
  toUserId: string;
  body: string;
}): Promise<ExhibitorMessage> {
  const rows = await db.insert(exhibitorMessages).values(data).returning();
  return rows[0];
}

/** Messages between this booth and a specific viewer (both directions). */
export async function getThread(boothId: string, viewerUserId: string): Promise<ExhibitorMessage[]> {
  return db
    .select()
    .from(exhibitorMessages)
    .where(
      and(
        eq(exhibitorMessages.boothId, boothId),
        eq(exhibitorMessages.toUserId, viewerUserId),
      ),
    )
    .orderBy(desc(exhibitorMessages.createdAt));
}
