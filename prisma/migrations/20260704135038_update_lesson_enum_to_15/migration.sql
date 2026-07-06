-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Lesson" ADD VALUE 'LESSON_6';
ALTER TYPE "Lesson" ADD VALUE 'LESSON_7';
ALTER TYPE "Lesson" ADD VALUE 'LESSON_8';
ALTER TYPE "Lesson" ADD VALUE 'LESSON_9';
ALTER TYPE "Lesson" ADD VALUE 'LESSON_10';
ALTER TYPE "Lesson" ADD VALUE 'LESSON_11';
ALTER TYPE "Lesson" ADD VALUE 'LESSON_12';
ALTER TYPE "Lesson" ADD VALUE 'LESSON_13';
ALTER TYPE "Lesson" ADD VALUE 'LESSON_14';
ALTER TYPE "Lesson" ADD VALUE 'LESSON_15';
