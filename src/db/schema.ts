import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const categories = ["photo", "illustration", "3d", "video"] as const;
export type Category = (typeof categories)[number];

export type PaletteColor = { hex: string; name?: string };

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const images = sqliteTable(
  "images",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    title: text("title").notNull(),
    description: text("description").default(""),
    category: text("category", { enum: categories })
      .notNull()
      .default("photo"),
    tags: text("tags", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
    prompt: text("prompt").default(""),
    palette: text("palette", { mode: "json" })
      .$type<PaletteColor[]>()
      .notNull()
      .default(sql`'[]'`),
    url: text("url").notNull(),
    thumbnailUrl: text("thumbnail_url").notNull(),
    width: integer("width").default(1200),
    height: integer("height").default(800),
    sizeBytes: integer("size_bytes").default(0),
    downloads: integer("downloads").notNull().default(0),
    trending: integer("trending").notNull().default(0),
    isDailyPick: integer("is_daily_pick", { mode: "boolean" })
      .notNull()
      .default(false),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
    blurDataUrl: text("blur_data_url").default(""),
  },
  (table) => [
    index("images_category_idx").on(table.category),
    index("images_created_idx").on(table.createdAt),
  ]
);

export const errorLogs = sqliteTable(
  "error_logs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    message: text("message").notNull(),
    stack: text("stack").default(""),
    url: text("url").default(""),
    userAgent: text("user_agent").default(""),
    status: text("status").notNull().default("unresolved"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [
    index("error_logs_status_idx").on(table.status),
    index("error_logs_created_idx").on(table.createdAt),
  ]
);

export type Setting = typeof settings.$inferSelect;
export type Image = typeof images.$inferSelect;
export type NewImage = typeof images.$inferInsert;
export type ErrorLog = typeof errorLogs.$inferSelect;
export type NewErrorLog = typeof errorLogs.$inferInsert;