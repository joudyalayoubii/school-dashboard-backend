import { Controller, Patch, Get, Body, Query, UseGuards, Request, BadRequestException } from '@nestjs/common';
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

  // PATCH /lesson-control/update - SCHOOL_ADMIN acts within their own school; SUPER_ADMIN must supply schoolId
  @Patch('update')
  @Roles(Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
  async updateLessonControl(@Body() updateDto: UpdateLessonControlDto, @Request() req) {
    const schoolId = req.user.role === Role.SUPER_ADMIN ? updateDto.schoolId : req.user.schoolId;

    if (!schoolId) {
      throw new BadRequestException('schoolId is required. SUPER_ADMIN must provide schoolId in request body.');
    }

    return this.lessonControlService.updateLessonControl(updateDto, schoolId);
  }

  // GET /lesson-control/status - STUDENT/SCHOOL_ADMIN get their own school; SUPER_ADMIN must supply schoolId
  @Get('status')
  @Roles(Role.STUDENT, Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
  async getLessonControls(@Request() req, @Query('schoolId') schoolId?: string) {
    const targetSchoolId = req.user.role === Role.SUPER_ADMIN ? schoolId : req.user.schoolId;

    if (!targetSchoolId) {
      throw new BadRequestException('schoolId query param is required for SUPER_ADMIN');
    }

    return this.lessonControlService.getLessonControls(targetSchoolId);
  }
}
