-- CreateTable
CREATE TABLE `BankConnection` (
    `id` VARCHAR(30) NOT NULL,
    `userId` VARCHAR(30) NOT NULL,
    `bankId` VARCHAR(40) NOT NULL,
    `providerId` VARCHAR(30) NOT NULL,
    `status` ENUM('PENDING', 'ACTIVE', 'REVOKING', 'REVOKED', 'EXPIRED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `version` INTEGER NOT NULL DEFAULT 1,
    `encryptedReference` TEXT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `revokedAt` DATETIME(3) NULL,
    `revocationAttempts` INTEGER NOT NULL DEFAULT 0,
    `nextRevocationAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `leaseUntil` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `BankConnection_status_nextRevocationAt_idx`(`status`, `nextRevocationAt`),
    UNIQUE INDEX `BankConnection_userId_bankId_key`(`userId`, `bankId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BankConsent` (
    `id` VARCHAR(30) NOT NULL,
    `connectionId` VARCHAR(30) NOT NULL,
    `revision` INTEGER NOT NULL,
    `textVersion` VARCHAR(30) NOT NULL,
    `locale` CHAR(2) NOT NULL,
    `text` TEXT NOT NULL,
    `scopes` JSON NOT NULL,
    `acceptedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NOT NULL,
    `networkHash` CHAR(64) NOT NULL,
    `userAgent` VARCHAR(180) NOT NULL,

    UNIQUE INDEX `BankConsent_connectionId_revision_key`(`connectionId`, `revision`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BankEvent` (
    `id` VARCHAR(30) NOT NULL,
    `connectionId` VARCHAR(30) NOT NULL,
    `actorId` VARCHAR(30) NOT NULL,
    `action` VARCHAR(40) NOT NULL,
    `revision` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `networkHash` CHAR(64) NOT NULL,
    `userAgent` VARCHAR(180) NOT NULL,

    INDEX `BankEvent_connectionId_createdAt_idx`(`connectionId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `BankConnection` ADD CONSTRAINT `BankConnection_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BankConsent` ADD CONSTRAINT `BankConsent_connectionId_fkey` FOREIGN KEY (`connectionId`) REFERENCES `BankConnection`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BankEvent` ADD CONSTRAINT `BankEvent_connectionId_fkey` FOREIGN KEY (`connectionId`) REFERENCES `BankConnection`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BankEvent` ADD CONSTRAINT `BankEvent_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
