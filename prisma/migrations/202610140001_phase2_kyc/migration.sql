-- CreateTable
CREATE TABLE `KycProfile` (
    `id` VARCHAR(30) NOT NULL,
    `userId` VARCHAR(30) NOT NULL,
    `status` ENUM('DRAFT', 'SUBMITTED', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'DRAFT',
    `version` INTEGER NOT NULL DEFAULT 1,
    `encryptedData` LONGTEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `KycProfile_userId_key`(`userId`),
    INDEX `KycProfile_status_updatedAt_idx`(`status`, `updatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KycSubmission` (
    `id` VARCHAR(30) NOT NULL,
    `profileId` VARCHAR(30) NOT NULL,
    `version` INTEGER NOT NULL,
    `encryptedData` LONGTEXT NOT NULL,
    `riskBand` VARCHAR(20) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `KycSubmission_profileId_version_key`(`profileId`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KycConsent` (
    `id` VARCHAR(30) NOT NULL,
    `submissionId` VARCHAR(30) NOT NULL,
    `kind` VARCHAR(30) NOT NULL,
    `version` VARCHAR(30) NOT NULL,
    `locale` CHAR(2) NOT NULL,
    `text` TEXT NOT NULL,
    `acceptedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `networkHash` CHAR(64) NOT NULL,
    `userAgent` VARCHAR(180) NOT NULL,

    UNIQUE INDEX `KycConsent_submissionId_kind_key`(`submissionId`, `kind`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KycReview` (
    `id` VARCHAR(30) NOT NULL,
    `submissionId` VARCHAR(30) NOT NULL,
    `reviewerId` VARCHAR(30) NOT NULL,
    `decision` ENUM('APPROVED', 'CHANGES_REQUESTED', 'REJECTED') NOT NULL,
    `encryptedReason` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `KycReview_submissionId_key`(`submissionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KycEvent` (
    `id` VARCHAR(30) NOT NULL,
    `profileId` VARCHAR(30) NOT NULL,
    `actorId` VARCHAR(30) NOT NULL,
    `action` VARCHAR(40) NOT NULL,
    `version` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `networkHash` CHAR(64) NOT NULL,
    `userAgent` VARCHAR(180) NOT NULL,

    INDEX `KycEvent_profileId_createdAt_idx`(`profileId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `KycProfile` ADD CONSTRAINT `KycProfile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KycSubmission` ADD CONSTRAINT `KycSubmission_profileId_fkey` FOREIGN KEY (`profileId`) REFERENCES `KycProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KycConsent` ADD CONSTRAINT `KycConsent_submissionId_fkey` FOREIGN KEY (`submissionId`) REFERENCES `KycSubmission`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KycReview` ADD CONSTRAINT `KycReview_submissionId_fkey` FOREIGN KEY (`submissionId`) REFERENCES `KycSubmission`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KycReview` ADD CONSTRAINT `KycReview_reviewerId_fkey` FOREIGN KEY (`reviewerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KycEvent` ADD CONSTRAINT `KycEvent_profileId_fkey` FOREIGN KEY (`profileId`) REFERENCES `KycProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KycEvent` ADD CONSTRAINT `KycEvent_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
