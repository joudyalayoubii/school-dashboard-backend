import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { Lesson, LessonStatus } from '@prisma/client';

export class UpdateLessonControlDto {
  @IsEnum(Lesson, {
    message: 'lessonName must be one of: LESSON_1 through LESSON_15',
  })
  @IsNotEmpty()
  lessonName: Lesson;

  @IsEnum(LessonStatus, {
    message: 'status must be one of: LOCKED, LESSON_OPEN, QUIZ_OPEN',
  })
  @IsNotEmpty()
  status: LessonStatus;

  @IsOptional()
  @IsUUID()
  @IsString()
  activeQuizId?: string;

  // Only honored for SUPER_ADMIN; SCHOOL_ADMIN always acts within their own school.
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  schoolId?: string;
}
