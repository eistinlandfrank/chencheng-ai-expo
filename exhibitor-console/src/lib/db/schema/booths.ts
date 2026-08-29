import type { InferSelectModel } from "drizzle-orm";
import { index, integer, jsonb, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

/**
 * Shared expo booths table. Both apps read it; exhibitors write their own booth.
 * Field names match the shared data-contract doc exactly so the audience app
 * can read the same columns.
 */
export const booths = pgTable(
  "booths",
  {
    id: varchar("id", { length: 8 }).primaryKey(), // booth number, e.g. "02"
    name: text("name").notNull().default(""),
    category: varchar("category", { length: 16 }).notNull().default("robot"),
    intro: text("intro").notNull().default(""),
    keywords: jsonb("keywords").$type<string[]>().notNull().default([]),
    recommendMinutes: integer("recommend_minutes").notNull().default(20),
    imageUrl: text("image_url"),
    videoUrl: text("video_url"),
    ownerName: text("owner_name"),
    ownerRole: text("owner_role"),
    ownerOrg: text("owner_org"),
    ownerContact: text("owner_contact"),
    zone: varchar("zone", { length: 16 }),
    gx: integer("gx"),
    gy: integer("gy"),
    // Which exhibitor user owns/edits this booth.
    exhibitorUserId: varchar("exhibitor_user_id", { length: 128 }),
    // Review status (admin-managed): draft / pending / approved.
    status: varchar("status", { length: 16 }).notNull().default("draft"),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    exhibitorIdx: index("booths_exhibitor_idx").on(table.exhibitorUserId),
    statusIdx: index("booths_status_idx").on(table.status),
  }),
);

export type Booth = InferSelectModel<typeof booths>;
export const BOOTH_CATEGORIES = ["robot", "ai", "chip", "hardware", "software", "service"] as const;
