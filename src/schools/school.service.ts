import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import { LessonControlService } from '../lesson-control/lesson-control.service';

@Injectable()
export class SchoolService {
  constructor(
    private prisma: PrismaService,
    private lessonControlService: LessonControlService,
  ) {}

  async getAllSchools() {
    const schools = await this.prisma.school.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { users: { where: { role: Role.STUDENT } } } },
      },
    });

    return schools.map((school) => ({
      id: school.id,
      name: school.name,
      studentCount: school._count.users,
      createdAt: school.createdAt,
    }));
  }

  async getLessonsForSchool(schoolId: string) {
    const { lessonControls } = await this.lessonControlService.getLessonControls(schoolId);

    const quizzes = await this.prisma.quiz.findMany({
      where: { schoolId },
      include: { _count: { select: { questions: true } } },
    });
    const quizByLesson = new Map(quizzes.map((q) => [q.lessonName, q]));

    return lessonControls.map((lc) => {
      const quiz = quizByLesson.get(lc.lessonName);
      return {
        lessonName: lc.lessonName,
        status: lc.status,
        activeQuizId: lc.activeQuizId,
        secondsRemaining: lc.secondsRemaining,
        quizId: quiz?.id ?? null,
        questionCount: quiz?._count.questions ?? 0,
      };
    });
  }

  async getSchoolDetails(schoolId: string) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
    });

    if (!school) {
      throw new NotFoundException('School not found');
    }

    const studentCount = await this.prisma.user.count({
      where: { schoolId, role: Role.STUDENT },
    });

    return {
      id: school.id,
      name: school.name,
      studentCount,
      createdAt: school.createdAt,
    };
  }

  async updateSchool(schoolId: string, name: string) {
    const existing = await this.prisma.school.findUnique({ where: { id: schoolId } });
    if (!existing) {
      throw new NotFoundException('School not found');
    }

    return this.prisma.school.update({
      where: { id: schoolId },
      data: { name },
    });
  }

  async deleteSchool(schoolId: string) {
    const existing = await this.prisma.school.findUnique({ where: { id: schoolId } });
    if (!existing) {
      throw new NotFoundException('School not found');
    }

    // Cascades to users, quizzes, lesson controls, and submissions (schema onDelete: Cascade).
    await this.prisma.school.delete({ where: { id: schoolId } });
  }
}
