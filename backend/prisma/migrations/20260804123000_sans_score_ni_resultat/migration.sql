-- Le score et le mot sur le match sont retirés : l'app sert à savoir qui vient
-- et où on joue, pas à tenir des statistiques d'après-match.

-- Les lignes du fil qui annonçaient un score n'ont plus de type valide.
DELETE FROM "Activity" WHERE "type" = 'score';

-- AlterTable
ALTER TABLE "Event" DROP COLUMN "resultNote",
DROP COLUMN "score";
