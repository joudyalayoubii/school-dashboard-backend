import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { QuizService } from '../quiz/quiz.service';
import { Role } from '@prisma/client';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private quizService: QuizService) {}

  // GET /reports/students-grades - Get students grades report (SCHOOL_ADMIN only)
  @Get('students-grades')
  @Roles(Role.SCHOOL_ADMIN)
  async getStudentsGrades(@Request() req) {
    return this.quizService.getStudentsGrades(req.user.schoolId);
  }
}
