import type { InferSelectModel } from "drizzle-orm";
import { index, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

/** Exhibitor ↔ viewer messages, used on the audience list to leave/reply. */
export const exhibitorMessages = pgTable(
  "exhibitor_messages",
  {
    id: serial("id").primaryKey(),
    boothId: varchar("booth_id", { length: 8 }).notNull(),
    fromUserId: varchar("from_user_id", { length: 128 }).notNull(),
    toUserId: varchar("to_user_id", { length: 128 }).notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    boothIdx: index("messages_booth_idx").on(table.boothId),
    toUserIdx: index("messages_to_user_idx").on(table.toUserId),
  }),
);

export type ExhibitorMessage = InferSelectModel<typeof exhibitorMessages>;
