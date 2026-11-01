-- Institutional applicants remain PENDING and cannot self-verify.
-- No dealing, custody, funding or investment tables are introduced.
CREATE TABLE `EntityApplication` (
  `id` VARCHAR(30) NOT NULL,
  `userId` VARCHAR(30) NOT NULL,
  `kind` ENUM('INDIVIDUAL','INSTITUTION','GOVERNMENT') NOT NULL,
  `status` ENUM('SUBMITTED','CHANGES_REQUESTED','VERIFIED','REJECTED') NOT NULL DEFAULT 'SUBMITTED',
  `encryptedData` LONGTEXT NOT NULL,
  `submittedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `EntityApplication_userId_key`(`userId`),
  INDEX `EntityApplication_status_submittedAt_idx`(`status`, `submittedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `EntityApplication` ADD CONSTRAINT `EntityApplication_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
