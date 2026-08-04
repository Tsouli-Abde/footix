-- Plus de date de fin des réponses : on répond jusqu'au coup d'envoi, et le job
-- horaire clôture en silence les sondages dont le match est passé.
-- AlterTable
ALTER TABLE "Event" DROP COLUMN "voteDeadline";
