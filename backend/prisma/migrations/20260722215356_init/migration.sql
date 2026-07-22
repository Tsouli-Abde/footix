-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'ponctuel',
    "matchDate" DATETIME NOT NULL,
    "occurrenceKey" TEXT NOT NULL,
    "voteDeadline" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ouvert',
    "chosenVenue" TEXT,
    "publicToken" TEXT NOT NULL,
    "organizerToken" TEXT NOT NULL,
    "recurrenceTemplateId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Event_recurrenceTemplateId_fkey" FOREIGN KEY ("recurrenceTemplateId") REFERENCES "RecurrenceTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Participant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,
    "availability" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Participant_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecurrenceTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "weekday" INTEGER NOT NULL,
    "deadlineHoursBefore" INTEGER NOT NULL DEFAULT 18,
    "leadTimeDays" INTEGER NOT NULL DEFAULT 3,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "organizerToken" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Event_occurrenceKey_key" ON "Event"("occurrenceKey");

-- CreateIndex
CREATE UNIQUE INDEX "Event_publicToken_key" ON "Event"("publicToken");

-- CreateIndex
CREATE UNIQUE INDEX "Event_organizerToken_key" ON "Event"("organizerToken");

-- CreateIndex
CREATE INDEX "Event_matchDate_idx" ON "Event"("matchDate");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_eventId_nameKey_key" ON "Participant"("eventId", "nameKey");

-- CreateIndex
CREATE UNIQUE INDEX "RecurrenceTemplate_organizerToken_key" ON "RecurrenceTemplate"("organizerToken");
