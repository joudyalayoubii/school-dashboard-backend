-- CreateEnum
CREATE TYPE "LessonStatus" AS ENUM ('LOCKED', 'LESSON_OPEN', 'QUIZ_OPEN');

-- CreateTable
CREATE TABLE "LessonControl" (
    "id" TEXT NOT NULL,
    "lessonName" "Lesson" NOT NULL,
    "status" "LessonStatus" NOT NULL DEFAULT 'LOCKED',
    "activeQuizId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "schoolId" TEXT NOT NULL,

    CONSTRAINT "LessonControl_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LessonControl_lessonName_schoolId_key" ON "LessonControl"("lessonName", "schoolId");

-- AddForeignKey
ALTER TABLE "LessonControl" ADD CONSTRAINT "LessonControl_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
