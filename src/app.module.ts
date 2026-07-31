import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { SchoolModule } from './schools/school.module';
import { StudentsModule } from './students/students.module';
import { QuizModule } from './quiz/quiz.module';
import { ReportsModule } from './reports/reports.module';
import { LessonControlModule } from './lesson-control/lesson-control.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    SchoolModule,
    StudentsModule,
    QuizModule,
    ReportsModule,
    LessonControlModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
