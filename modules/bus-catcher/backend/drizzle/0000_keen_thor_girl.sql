CREATE TABLE `calendar` (
	`service_id` text PRIMARY KEY NOT NULL,
	`monday` integer NOT NULL,
	`tuesday` integer NOT NULL,
	`wednesday` integer NOT NULL,
	`thursday` integer NOT NULL,
	`friday` integer NOT NULL,
	`saturday` integer NOT NULL,
	`sunday` integer NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `calendar_dates` (
	`service_id` text NOT NULL,
	`date` text NOT NULL,
	`exception_type` integer NOT NULL,
	PRIMARY KEY(`service_id`, `date`)
);
--> statement-breakpoint
CREATE INDEX `calendar_dates_date_idx` ON `calendar_dates` (`date`);--> statement-breakpoint
CREATE TABLE `configured_stops` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`stop_id` text NOT NULL,
	`line_filter` text,
	`display_order` integer DEFAULT 0 NOT NULL,
	`enabled` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`stop_id`) REFERENCES `stops`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `lines` (
	`id` text PRIMARY KEY NOT NULL,
	`short_name` text NOT NULL,
	`long_name` text NOT NULL,
	`route_type` integer NOT NULL,
	`agency_id` text
);
--> statement-breakpoint
CREATE TABLE `metadata` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `stop_times` (
	`trip_id` text NOT NULL,
	`stop_sequence` integer NOT NULL,
	`stop_id` text NOT NULL,
	`arrival_min` integer NOT NULL,
	`departure_min` integer NOT NULL,
	`pickup_type` integer,
	`drop_off_type` integer,
	PRIMARY KEY(`trip_id`, `stop_sequence`),
	FOREIGN KEY (`trip_id`) REFERENCES `trips`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`stop_id`) REFERENCES `stops`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `stop_times_stop_arrival_idx` ON `stop_times` (`stop_id`,`arrival_min`);--> statement-breakpoint
CREATE INDEX `stop_times_trip_idx` ON `stop_times` (`trip_id`);--> statement-breakpoint
CREATE TABLE `stops` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`lat` real,
	`lon` real
);
--> statement-breakpoint
CREATE TABLE `trips` (
	`id` text PRIMARY KEY NOT NULL,
	`line_id` text NOT NULL,
	`service_id` text NOT NULL,
	`headsign` text NOT NULL,
	`direction_id` integer,
	FOREIGN KEY (`line_id`) REFERENCES `lines`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `trips_service_idx` ON `trips` (`service_id`);