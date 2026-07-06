import { Module } from '@nestjs/common';
import { QuizController } from './quiz.controller';
import { QuizService } from './quiz.service';
import { PrismaModule } from '../prisma/prisma.module';
import { LessonControlModule } from '../lesson-control/lesson-control.module';

@Module({
  imports: [PrismaModule, LessonControlModule],
  controllers: [QuizController],
  providers: [QuizService],
  exports: [QuizService],
})
export class QuizModule { }
