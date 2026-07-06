import { Injectable, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { AddQuestionsDto } from './dto/create-question.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { Lesson, LessonStatus } from '@prisma/client';
import { LessonControlService } from '../lesson-control/lesson-control.service';

@Injectable()
export class QuizService {
  constructor(
    private prisma: PrismaService,
    private lessonControlService: LessonControlService,
  ) { }

  // Create a quiz for a specific lesson (SCHOOL_ADMIN only)
  async createQuiz(lessonName: Lesson, schoolId: string) {
    // Check if quiz already exists for this lesson in this school
    const existingQuiz = await this.prisma.quiz.findUnique({
      where: {
        lessonName_schoolId: {
          lessonName,
          schoolId,
        },
      },
    });

    if (existingQuiz) {
      throw new ConflictException(
        `Quiz for lesson ${lessonName} already exists in this school`,
      );
    }

    const quiz = await this.prisma.quiz.create({
      data: {
        lessonName,
        schoolId,
      },
    });

    return {
      message: 'Quiz created successfully',
      quiz,
    };
  }

  // Add questions to a quiz (SCHOOL_ADMIN only)
  async addQuestions(quizId: string, questionsDto: AddQuestionsDto, schoolId: string) {
    // Verify quiz belongs to the admin's school
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    if (quiz.schoolId !== schoolId) {
      throw new ForbiddenException('You can only add questions to quizzes in your school');
    }

    // Create questions
    const questions = await this.prisma.question.createMany({
      data: questionsDto.questions.map((q) => ({
        questionText: q.questionText,
        questionType: q.questionType,
        options: q.options,
        correctAnswer: q.correctAnswer,
        quizId,
      })),
    });

    return {
      message: 'Questions added successfully',
      count: questions.count,
    };
  }

  // Get quiz by lesson name for student (without correct answers)
  async getQuizByLesson(lessonName: Lesson, studentSchoolId: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: {
        lessonName_schoolId: {
          lessonName,
          schoolId: studentSchoolId,
        },
      },
      include: {
        questions: {
          select: {
            id: true,
            questionText: true,
            questionType: true,
            options: true,
            // Omit correctAnswer for security
          },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found for this lesson in your school');
    }

    return quiz;
  }

  // Submit quiz answers and calculate score
  async submitQuiz(quizId: string, submitDto: SubmitQuizDto, studentId: string) {
    // Get quiz with questions and correct answers
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: true,
      },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    // Verify student belongs to the same school as the quiz
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: { schoolId: true },
    });

    if (!student || student.schoolId !== quiz.schoolId) {
      throw new ForbiddenException('You can only submit quizzes for your school');
    }

    // Check lesson control - quiz must be active and lesson must be QUIZ_OPEN
    const lessonControl = await this.lessonControlService.getLessonControl(
      quiz.lessonName,
      student.schoolId,
    );

    if (lessonControl.status !== LessonStatus.QUIZ_OPEN) {
      throw new ForbiddenException('Quiz is not currently open for submission');
    }

    if (lessonControl.activeQuizId !== quizId) {
      throw new ForbiddenException('This quiz is not the currently active quiz for this lesson');
    }

    // Check if student already submitted this quiz
    const existingSubmission = await this.prisma.submission.findUnique({
      where: {
        studentId_quizId: {
          studentId,
          quizId,
        },
      },
    });

    if (existingSubmission) {
      throw new ConflictException('You have already submitted this quiz');
    }

    // Calculate score
    let correctCount = 0;
    const totalQuestions = quiz.questions.length;

    for (const answer of submitDto.answers) {
      const question = quiz.questions.find((q) => q.id === answer.questionId);
      if (question && question.correctAnswer === answer.answer) {
        correctCount++;
      }
    }

    // Calculate score as percentage
    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    // Save submission
    const submission = await this.prisma.submission.create({
      data: {
        score,
        lessonName: quiz.lessonName,
        studentId,
        quizId,
      },
    });

    return {
      message: 'Quiz submitted successfully',
      score,
      correctCount,
      totalQuestions,
      submission,
    };
  }

  // Get students grades report for school admin
  async getStudentsGrades(schoolId: string) {
    // Get all students in the school
    const students = await this.prisma.user.findMany({
      where: {
        schoolId,
        role: 'STUDENT',
      },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
      },
    });

    // Get all submissions for this school
    const submissions = await this.prisma.submission.findMany({
      where: {
        student: {
          schoolId,
        },
      },
      include: {
        student: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
      },
    });

    // Calculate grades for each student
    const studentsGrades = students.map((student) => {
      const studentSubmissions = submissions.filter((s) => s.studentId === student.id);

      // Initialize scores for all 15 lessons
      const lessonScores: Record<string, number | null> = {
        LESSON_1: null,
        LESSON_2: null,
        LESSON_3: null,
        LESSON_4: null,
        LESSON_5: null,
        LESSON_6: null,
        LESSON_7: null,
        LESSON_8: null,
        LESSON_9: null,
        LESSON_10: null,
        LESSON_11: null,
        LESSON_12: null,
        LESSON_13: null,
        LESSON_14: null,
        LESSON_15: null,
      };

      let totalScore = 0;
      let submittedLessons = 0;

      studentSubmissions.forEach((submission) => {
        lessonScores[submission.lessonName] = submission.score;
        totalScore += submission.score;
        submittedLessons++;
      });

      // Calculate average score
      const averageScore = submittedLessons > 0 ? Math.round(totalScore / submittedLessons) : 0;

      return {
        studentId: student.id,
        username: student.username,
        name: student.name,
        email: student.email,
        lessonScores,
        totalScore,
        averageScore,
        submittedLessons,
      };
    });

    return {
      message: 'Students grades retrieved successfully',
      totalStudents: students.length,
      studentsGrades,
    };
  }
}
