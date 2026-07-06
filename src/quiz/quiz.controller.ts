import { Controller, Get, Post, Body, Param, UseGuards, Request, ParseEnumPipe, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { QuizService } from './quiz.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { AddQuestionsDto } from './dto/create-question.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { Role, Lesson } from '@prisma/client';

@Controller('quizzes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QuizController {
  constructor(private quizService: QuizService) { }

  // POST /quizzes - Create a quiz for a specific lesson (SCHOOL_ADMIN or SUPER_ADMIN)
  @Post()
  @Roles(Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
  async createQuiz(@Body() createQuizDto: CreateQuizDto, @Request() req) {
    // SUPER_ADMIN can specify schoolId in body, SCHOOL_ADMIN uses their own schoolId
    const schoolId = createQuizDto.schoolId || req.user.schoolId;

    if (!schoolId) {
      throw new BadRequestException('schoolId is required. SUPER_ADMIN must provide schoolId in request body.');
    }

    return this.quizService.createQuiz(createQuizDto.lessonName, schoolId);
  }

  // POST /quizzes/:id/questions - Add questions to a quiz (SCHOOL_ADMIN or SUPER_ADMIN)
  @Post(':id/questions')
  @Roles(Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
  async addQuestions(
    @Param('id') quizId: string,
    @Body() addQuestionsDto: AddQuestionsDto,
    @Request() req,
  ) {
    return this.quizService.addQuestions(quizId, addQuestionsDto, req.user.schoolId);
  }

  // GET /quizzes/lesson/:lessonName - Get quiz for a lesson (STUDENT only)
  @Get('lesson/:lessonName')
  @Roles(Role.STUDENT)
  async getQuizByLesson(
    @Param('lessonName', new ParseEnumPipe(Lesson)) lessonName: Lesson,
    @Request() req,
  ) {
    return this.quizService.getQuizByLesson(lessonName, req.user.schoolId);
  }

  // POST /quizzes/:id/submit - Submit quiz answers (STUDENT only)
  @Post(':id/submit')
  @Roles(Role.STUDENT)
  async submitQuiz(
    @Param('id') quizId: string,
    @Body() submitQuizDto: SubmitQuizDto,
    @Request() req,
  ) {
    return this.quizService.submitQuiz(quizId, submitQuizDto, req.user.id);
  }
}
