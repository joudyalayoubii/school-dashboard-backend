import { Controller, Patch, Get, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { LessonControlService } from './lesson-control.service';
import { UpdateLessonControlDto } from './dto/update-lesson-control.dto';
import { Role } from '@prisma/client';

@Controller('lesson-control')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LessonControlController {
  constructor(private lessonControlService: LessonControlService) {}

  // PATCH /lesson-control/update - Update lesson control status (SCHOOL_ADMIN only)
  @Patch('update')
  @Roles(Role.SCHOOL_ADMIN)
  async updateLessonControl(@Body() updateDto: UpdateLessonControlDto, @Request() req) {
    return this.lessonControlService.updateLessonControl(updateDto, req.user.schoolId);
  }

  // GET /lesson-control/status - Get all lesson controls for student's school (STUDENT only)
  @Get('status')
  @Roles(Role.STUDENT)
  async getLessonControls(@Request() req) {
    return this.lessonControlService.getLessonControls(req.user.schoolId);
  }
}
