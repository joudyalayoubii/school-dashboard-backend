import { Module } from '@nestjs/common';
import { LessonControlController } from './lesson-control.controller';
import { LessonControlService } from './lesson-control.service';
import { LessonControlGateway } from './lesson-control.gateway';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LessonControlController],
  providers: [LessonControlService, LessonControlGateway],
  exports: [LessonControlService],
})
export class LessonControlModule {}
