CREATE TABLE `miningRewards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`date` varchar(10) NOT NULL,
	`amount` decimal(20,8) NOT NULL DEFAULT '80',
	`claimed` boolean NOT NULL DEFAULT false,
	`claimedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `miningRewards_id` PRIMARY KEY(`id`)
);
