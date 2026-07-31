import { IsEnum, IsNotEmpty, IsOptional, IsObject, IsString } from 'class-validator';
import { QuestionType } from '@prisma/client';

export class UpdateQuestionDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  questionText?: string;

  @IsOptional()
  @IsEnum(QuestionType, {
    message: 'questionType must be one of: MCQ, TRUE_FALSE, SHORT_ANSWER',
  })
  questionType?: QuestionType;

  @IsOptional()
  @IsObject()
  options?: any;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  correctAnswer?: string;
}
