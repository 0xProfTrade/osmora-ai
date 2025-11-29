CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userEmail` varchar(320) NOT NULL,
	`planName` varchar(100) NOT NULL,
	`priceUsd` int NOT NULL,
	`coin` varchar(50) NOT NULL,
	`network` varchar(100) NOT NULL,
	`amountCrypto` text NOT NULL,
	`address` varchar(255) NOT NULL,
	`status` enum('pending','completed','failed') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
