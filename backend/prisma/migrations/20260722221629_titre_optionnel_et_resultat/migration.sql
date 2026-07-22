-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'ponctuel',
    "matchDate" DATETIME NOT NULL,
    "occurrenceKey" TEXT NOT NULL,
    "voteDeadline" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ouvert',
    "chosenVenue" TEXT,
    "score" TEXT,
    "resultNote" TEXT,
    "publicToken" TEXT NOT NULL,
    "organizerToken" TEXT NOT NULL,
    "recurrenceTemplateId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Event_recurrenceTemplateId_fkey" FOREIGN KEY ("recurrenceTemplateId") REFERENCES "RecurrenceTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Event" ("chosenVenue", "createdAt", "description", "id", "matchDate", "occurrenceKey", "organizerToken", "publicToken", "recurrenceTemplateId", "status", "title", "type", "updatedAt", "voteDeadline") SELECT "chosenVenue", "createdAt", "description", "id", "matchDate", "occurrenceKey", "organizerToken", "publicToken", "recurrenceTemplateId", "status", "title", "type", "updatedAt", "voteDeadline" FROM "Event";
DROP TABLE "Event";
ALTER TABLE "new_Event" RENAME TO "Event";
CREATE UNIQUE INDEX "Event_occurrenceKey_key" ON "Event"("occurrenceKey");
CREATE UNIQUE INDEX "Event_publicToken_key" ON "Event"("publicToken");
CREATE UNIQUE INDEX "Event_organizerToken_key" ON "Event"("organizerToken");
CREATE INDEX "Event_matchDate_idx" ON "Event"("matchDate");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
