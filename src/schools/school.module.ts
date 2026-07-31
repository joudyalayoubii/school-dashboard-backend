import { Module } from '@nestjs/common';
import { SchoolController } from './school.controller';
import { SchoolService } from './school.service';
import { PrismaModule } from '../prisma/prisma.module';
import { LessonControlModule } from '../lesson-control/lesson-control.module';

@Module({
  imports: [PrismaModule, LessonControlModule],
  controllers: [SchoolController],
  providers: [SchoolService],
})
export class SchoolModule {}
