import type { InferSelectModel } from "drizzle-orm";
import { index, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";

/**
 * Viewer ↔ booth relations, written by the audience app. The exhibitor app
 * reads this in reverse ("who chose me"). Field names match the shared doc.
 * kind: interest(收藏) / itinerary(加入行程) / checkin(打卡) / reserve(预约)
 */
export const expoBoothRelations = pgTable(
  "expo_booth_relations",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id", { length: 128 }).notNull(),
    boothId: varchar("booth_id", { length: 8 }).notNull(),
    kind: varchar("kind", { length: 16 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    boothKindIdx: index("relations_booth_kind_idx").on(table.boothId, table.kind),
    userIdx: index("relations_user_idx").on(table.userId),
  }),
);

export type ExpoBoothRelation = InferSelectModel<typeof expoBoothRelations>;
export const RELATION_KINDS = ["interest", "itinerary", "checkin", "reserve"] as const;
