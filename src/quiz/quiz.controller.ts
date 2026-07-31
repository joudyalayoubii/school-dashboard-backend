import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, UseInterceptors, Request, ParseEnumPipe, BadRequestException, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { StripCorrectAnswerInterceptor } from '../common/interceptors/strip-correct-answer.interceptor';
import { QuizService } from './quiz.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { AddQuestionsDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
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

  // GET /quizzes - List quizzes for a school (used to populate the exam dropdown).
  // SCHOOL_ADMIN sees their own school; SUPER_ADMIN must supply schoolId.
  @Get()
  @Roles(Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
  async listQuizzes(@Request() req, @Query('schoolId') schoolId?: string) {
    const targetSchoolId = req.user.role === Role.SUPER_ADMIN ? schoolId : req.user.schoolId;

    if (!targetSchoolId) {
      throw new BadRequestException('schoolId query param is required for SUPER_ADMIN');
    }

    return this.quizService.listQuizzesForSchool(targetSchoolId);
  }

  // POST /quizzes/:id/questions - Add questions to a quiz (SCHOOL_ADMIN or SUPER_ADMIN)
  @Post(':id/questions')
  @Roles(Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
  async addQuestions(
    @Param('id') quizId: string,
    @Body() addQuestionsDto: AddQuestionsDto,
    @Request() req,
  ) {
    // SUPER_ADMIN may add questions to any school's quiz; SCHOOL_ADMIN only their own (enforced in service).
    const schoolId = req.user.role === Role.SUPER_ADMIN ? null : req.user.schoolId;
    return this.quizService.addQuestions(quizId, addQuestionsDto, schoolId);
  }

  // GET /quizzes/:id - Get a quiz with its full questions, including correctAnswer, for
  // admin management (SCHOOL_ADMIN or SUPER_ADMIN). Distinct from GET /quizzes/lesson/:lessonName,
  // which is the sanitized STUDENT-facing view.
  @Get(':id')
  @Roles(Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
  async getQuizForAdmin(@Param('id') quizId: string, @Request() req) {
    const schoolId = req.user.role === Role.SUPER_ADMIN ? null : req.user.schoolId;
    return this.quizService.getQuizForAdmin(quizId, schoolId);
  }

  // DELETE /quizzes/:id - Delete a quiz entirely (SCHOOL_ADMIN or SUPER_ADMIN)
  @Delete(':id')
  @Roles(Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async deleteQuiz(@Param('id') quizId: string, @Request() req) {
    const schoolId = req.user.role === Role.SUPER_ADMIN ? null : req.user.schoolId;
    return this.quizService.deleteQuiz(quizId, schoolId);
  }

  // PATCH /quizzes/:id/questions/:questionId - Edit a question (SCHOOL_ADMIN or SUPER_ADMIN)
  @Patch(':id/questions/:questionId')
  @Roles(Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
  async updateQuestion(
    @Param('id') quizId: string,
    @Param('questionId') questionId: string,
    @Body() updateQuestionDto: UpdateQuestionDto,
    @Request() req,
  ) {
    const schoolId = req.user.role === Role.SUPER_ADMIN ? null : req.user.schoolId;
    return this.quizService.updateQuestion(quizId, questionId, updateQuestionDto, schoolId);
  }

  // DELETE /quizzes/:id/questions/:questionId - Remove a question (SCHOOL_ADMIN or SUPER_ADMIN)
  @Delete(':id/questions/:questionId')
  @Roles(Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async deleteQuestion(@Param('id') quizId: string, @Param('questionId') questionId: string, @Request() req) {
    const schoolId = req.user.role === Role.SUPER_ADMIN ? null : req.user.schoolId;
    return this.quizService.deleteQuestion(quizId, questionId, schoolId);
  }

  // GET /quizzes/lesson/:lessonName - Get quiz for a lesson (STUDENT only)
  @Get('lesson/:lessonName')
  @Roles(Role.STUDENT)
  @UseInterceptors(StripCorrectAnswerInterceptor)
  async getQuizByLesson(
    @Param('lessonName', new ParseEnumPipe(Lesson)) lessonName: Lesson,
    @Request() req,
  ) {
    return this.quizService.getQuizByLesson(lessonName, req.user.schoolId, req.user.id);
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
