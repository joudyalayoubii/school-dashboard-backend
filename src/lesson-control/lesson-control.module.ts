import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { LessonControlController } from './lesson-control.controller';
import { LessonControlService } from './lesson-control.service';
import { LessonControlGateway } from './lesson-control.gateway';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [LessonControlController],
  providers: [LessonControlService, LessonControlGateway],
  exports: [LessonControlService, LessonControlGateway],
})
export class LessonControlModule {}
