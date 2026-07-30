-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "hasTime" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "organizerName" TEXT,
ADD COLUMN     "reminderSentAt" TIMESTAMP(3);
