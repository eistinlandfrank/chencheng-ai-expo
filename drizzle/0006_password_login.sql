CREATE TABLE `auth_password_credentials` (
	`user_id` text PRIMARY KEY NOT NULL,
	`algorithm` text DEFAULT 'scrypt' NOT NULL,
	`cost_n` integer NOT NULL,
	`block_size` integer NOT NULL,
	`parallelization` integer NOT NULL,
	`key_length` integer NOT NULL,
	`salt_base64` text NOT NULL,
	`hash_base64` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `auth_users`(`id`) ON UPDATE no action ON DELETE no action
);
