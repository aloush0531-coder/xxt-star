ALTER TABLE `notifications` MODIFY COLUMN `type` enum('new_member','large_trade','deposit_request','withdrawal_request','system') NOT NULL;--> statement-breakpoint
ALTER TABLE `notifications` ADD `withdrawalId` int;--> statement-breakpoint
ALTER TABLE `notifications` ADD `actionStatus` enum('pending','approved','rejected') DEFAULT 'pending';