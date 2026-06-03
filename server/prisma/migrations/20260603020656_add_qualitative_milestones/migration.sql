-- AlterTable
ALTER TABLE "annual_goals" ADD COLUMN     "qualitative_milestones" JSONB NOT NULL DEFAULT '[]';
