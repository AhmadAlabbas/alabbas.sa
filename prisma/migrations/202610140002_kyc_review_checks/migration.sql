-- Explicit reviewer attestation is required by the application before approval.
ALTER TABLE `KycReview` ADD COLUMN `checksConfirmed` BOOLEAN NOT NULL DEFAULT false;
