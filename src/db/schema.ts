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

export const r2Accounts = sqliteTable("r2_accounts", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  accountId: text("account_id").notNull(),
  accessKeyId: text("access_key_id").notNull(),
  secretAccessKey: text("secret_access_key").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const r2Buckets = sqliteTable(
  "r2_buckets",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    accountId: text("account_id")
      .notNull()
      .references(() => r2Accounts.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    publicUrl: text("public_url"),
    quotaBytes: integer("quota_bytes").notNull().default(10 * 1024 * 1024 * 1024),
    usedBytes: integer("used_bytes").notNull().default(0),
    lastSyncAt: text("last_sync_at"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [
    index("r2_buckets_account_idx").on(table.accountId),
  ]
);

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
    r2Key: text("r2_key"),
    bucketId: text("bucket_id").references(() => r2Buckets.id, {
      onDelete: "set null",
    }),
    sizeBytes: integer("size_bytes").default(0),
    downloads: integer("downloads").notNull().default(0),
    trending: integer("trending").notNull().default(0),
    isDailyPick: integer("is_daily_pick", { mode: "boolean" })
      .notNull()
      .default(false),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [
    index("images_category_idx").on(table.category),
    index("images_created_idx").on(table.createdAt),
  ]
);

export type Setting = typeof settings.$inferSelect;
export type R2Account = typeof r2Accounts.$inferSelect;
export type NewR2Account = typeof r2Accounts.$inferInsert;
export type R2Bucket = typeof r2Buckets.$inferSelect;
export type NewR2Bucket = typeof r2Buckets.$inferInsert;
export type Image = typeof images.$inferSelect;
export type NewImage = typeof images.$inferInsert;