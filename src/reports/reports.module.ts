import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { QuizModule } from '../quiz/quiz.module';

@Module({
  imports: [QuizModule],
  controllers: [ReportsController],
})
export class ReportsModule {}
