CREATE TABLE `images` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '',
	`category` text DEFAULT 'photo' NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`prompt` text DEFAULT '',
	`palette` text DEFAULT '[]' NOT NULL,
	`url` text NOT NULL,
	`thumbnail_url` text NOT NULL,
	`width` integer DEFAULT 1200,
	`height` integer DEFAULT 800,
	`r2_key` text,
	`bucket_id` text,
	`size_bytes` integer DEFAULT 0,
	`downloads` integer DEFAULT 0 NOT NULL,
	`trending` integer DEFAULT 0 NOT NULL,
	`is_daily_pick` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`bucket_id`) REFERENCES `r2_buckets`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `images_category_idx` ON `images` (`category`);--> statement-breakpoint
CREATE INDEX `images_created_idx` ON `images` (`created_at`);--> statement-breakpoint
CREATE TABLE `r2_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`account_id` text NOT NULL,
	`access_key_id` text NOT NULL,
	`secret_access_key` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `r2_buckets` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`name` text NOT NULL,
	`public_url` text,
	`quota_bytes` integer DEFAULT 10737418240 NOT NULL,
	`used_bytes` integer DEFAULT 0 NOT NULL,
	`last_sync_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `r2_accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `r2_buckets_account_idx` ON `r2_buckets` (`account_id`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
