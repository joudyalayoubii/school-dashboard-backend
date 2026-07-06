import { IsEnum, IsNotEmpty, IsString, IsOptional, IsUUID } from 'class-validator';
import { Lesson } from '@prisma/client';

export class CreateQuizDto {
  @IsEnum(Lesson, {
    message: 'lessonName must be one of: LESSON_1 through LESSON_15',
  })
  @IsNotEmpty()
  lessonName: Lesson;

  @IsOptional()
  @IsUUID()
  @IsString()
  schoolId?: string;
}
