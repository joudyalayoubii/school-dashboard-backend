import { IsEnum, IsNotEmpty, IsString, IsOptional, IsObject } from 'class-validator';
import { QuestionType } from '@prisma/client';

export class CreateQuestionDto {
  @IsString()
  @IsNotEmpty()
  questionText: string;

  @IsEnum(QuestionType, {
    message: 'questionType must be one of: MCQ, TRUE_FALSE, SHORT_ANSWER',
  })
  @IsNotEmpty()
  questionType: QuestionType;

  @IsOptional()
  @IsObject()
  options?: any;

  @IsString()
  @IsNotEmpty()
  correctAnswer: string;
}

export class AddQuestionsDto {
  @IsNotEmpty()
  questions: CreateQuestionDto[];
}
