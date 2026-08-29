import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "../client";
import { expoBoothRelations } from "../schema/expo-booth-relations";
import { users } from "../schema/users";

export interface BoothStats {
  interest: number;
  itinerary: number;
  reserve: number;
  checkin: number;
  todayNew: number;
  trend: number[]; // last 7 buckets of new relations
}

/** Aggregate "who chose me" counts for a booth (reverse-read of relations). */
export async function getBoothStats(boothId: string): Promise<BoothStats> {
  const rows = await db
    .select({ kind: expoBoothRelations.kind, count: sql<number>`count(*)::int` })
    .from(expoBoothRelations)
    .where(eq(expoBoothRelations.boothId, boothId))
    .groupBy(expoBoothRelations.kind);

  const byKind: Record<string, number> = {};
  for (const r of rows) byKind[r.kind] = r.count;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(expoBoothRelations)
    .where(
      and(eq(expoBoothRelations.boothId, boothId), gte(expoBoothRelations.createdAt, startOfToday)),
    );

  // Simple 7-bucket trend by day.
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 6);
  weekAgo.setHours(0, 0, 0, 0);
  const trendRows = await db
    .select({
      day: sql<string>`to_char(${expoBoothRelations.createdAt}, 'YYYY-MM-DD')`,
      count: sql<number>`count(*)::int`,
    })
    .from(expoBoothRelations)
    .where(and(eq(expoBoothRelations.boothId, boothId), gte(expoBoothRelations.createdAt, weekAgo)))
    .groupBy(sql`to_char(${expoBoothRelations.createdAt}, 'YYYY-MM-DD')`);

  const trendMap: Record<string, number> = {};
  for (const r of trendRows) trendMap[r.day] = r.count;
  const trend: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    trend.push(trendMap[d.toISOString().slice(0, 10)] ?? 0);
  }

  return {
    interest: byKind.interest ?? 0,
    itinerary: byKind.itinerary ?? 0,
    reserve: byKind.reserve ?? 0,
    checkin: byKind.checkin ?? 0,
    todayNew: todayRows[0]?.count ?? 0,
    trend,
  };
}

export interface AudienceMember {
  relationId: number;
  userId: string;
  name: string | null;
  avatarUrl: string | null;
  kind: string;
  createdAt: Date;
}

/** Viewers who chose this booth, joined with their user profile. */
export async function getBoothAudience(boothId: string, kind?: string): Promise<AudienceMember[]> {
  const where = kind
    ? and(eq(expoBoothRelations.boothId, boothId), eq(expoBoothRelations.kind, kind))
    : eq(expoBoothRelations.boothId, boothId);

  return db
    .select({
      relationId: expoBoothRelations.id,
      userId: expoBoothRelations.userId,
      name: users.name,
      avatarUrl: users.avatarUrl,
      kind: expoBoothRelations.kind,
      createdAt: expoBoothRelations.createdAt,
    })
    .from(expoBoothRelations)
    .leftJoin(users, eq(users.id, expoBoothRelations.userId))
    .where(where)
    .orderBy(desc(expoBoothRelations.createdAt));
}
