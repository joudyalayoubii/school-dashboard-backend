import { IsNotEmpty, IsObject, IsString } from 'class-validator';

export class SubmitAnswerDto {
  @IsString()
  @IsNotEmpty()
  questionId: string;

  @IsNotEmpty()
  answer: string;
}

export class SubmitQuizDto {
  @IsNotEmpty()
  answers: SubmitAnswerDto[];
}
