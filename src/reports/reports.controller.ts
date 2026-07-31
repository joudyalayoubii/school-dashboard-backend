import { Controller, Get, Query, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { QuizService } from '../quiz/quiz.service';
import { Role } from '@prisma/client';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private quizService: QuizService) {}

  // GET /reports/students-grades - SCHOOL_ADMIN gets their own school; SUPER_ADMIN must supply schoolId
  @Get('students-grades')
  @Roles(Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
  async getStudentsGrades(@Request() req, @Query('schoolId') schoolId?: string) {
    const targetSchoolId = req.user.role === Role.SUPER_ADMIN ? schoolId : req.user.schoolId;

    if (!targetSchoolId) {
      throw new BadRequestException('schoolId query param is required for SUPER_ADMIN');
    }

    return this.quizService.getStudentsGrades(targetSchoolId);
  }
}
