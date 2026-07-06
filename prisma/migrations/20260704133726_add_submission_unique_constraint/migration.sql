/*
  Warnings:

  - A unique constraint covering the columns `[studentId,quizId]` on the table `Submission` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Submission_studentId_quizId_key" ON "Submission"("studentId", "quizId");
