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
    "winningOptionId" TEXT,
    "publicToken" TEXT NOT NULL,
    "organizerToken" TEXT NOT NULL,
    "recurrenceTemplateId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Event_recurrenceTemplateId_fkey" FOREIGN KEY ("recurrenceTemplateId") REFERENCES "RecurrenceTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Option" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "capacity" INTEGER,
    "position" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Option_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Participant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Participant_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "participantId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    CONSTRAINT "Vote_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Vote_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "Option" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecurrenceTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "weekday" INTEGER NOT NULL,
    "matchTime" TEXT NOT NULL,
    "deadlineHoursBefore" INTEGER NOT NULL DEFAULT 26,
    "leadTimeDays" INTEGER NOT NULL DEFAULT 3,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "organizerToken" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TemplateOption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "capacity" INTEGER,
    "position" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "TemplateOption_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "RecurrenceTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
CREATE INDEX "Option_eventId_idx" ON "Option"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_eventId_nameKey_key" ON "Participant"("eventId", "nameKey");

-- CreateIndex
CREATE INDEX "Vote_optionId_idx" ON "Vote"("optionId");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_participantId_optionId_key" ON "Vote"("participantId", "optionId");

-- CreateIndex
CREATE UNIQUE INDEX "RecurrenceTemplate_organizerToken_key" ON "RecurrenceTemplate"("organizerToken");

-- CreateIndex
CREATE INDEX "TemplateOption_templateId_idx" ON "TemplateOption"("templateId");
