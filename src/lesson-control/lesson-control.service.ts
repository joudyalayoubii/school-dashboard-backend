import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateLessonControlDto } from './dto/update-lesson-control.dto';
import { Lesson, LessonControl, LessonStatus } from '@prisma/client';
import { LessonControlGateway } from './lesson-control.gateway';

export const EXAM_DURATION_MS = 60 * 60 * 1000; // 1 hour, authoritative on the server

@Injectable()
export class LessonControlService {
  private readonly logger = new Logger(LessonControlService.name);

  constructor(
    private prisma: PrismaService,
    private lessonControlGateway: LessonControlGateway,
  ) {}

  // Update lesson control status (SCHOOL_ADMIN only)
  async updateLessonControl(updateDto: UpdateLessonControlDto, schoolId: string) {
    // If status is QUIZ_OPEN, activeQuizId is required
    if (updateDto.status === LessonStatus.QUIZ_OPEN && !updateDto.activeQuizId) {
      throw new BadRequestException('activeQuizId is required when status is QUIZ_OPEN');
    }

    // If activeQuizId is provided, verify the quiz exists and belongs to the school
    if (updateDto.activeQuizId) {
      const quiz = await this.prisma.quiz.findUnique({
        where: { id: updateDto.activeQuizId },
      });

      if (!quiz) {
        throw new NotFoundException('Quiz not found');
      }

      if (quiz.schoolId !== schoolId) {
        throw new BadRequestException('Quiz does not belong to your school');
      }

      // Verify the quiz lesson matches the lesson being controlled
      if (quiz.lessonName !== updateDto.lessonName) {
        throw new BadRequestException('Quiz lesson does not match the lesson being controlled');
      }
    }

    // The 60-minute countdown is anchored server-side the instant the exam opens,
    // and cleared whenever the lesson leaves QUIZ_OPEN so a later re-open starts fresh.
    const examStartedAt = updateDto.status === LessonStatus.QUIZ_OPEN ? new Date() : null;

    const lessonControl = await this.prisma.lessonControl.upsert({
      where: {
        lessonName_schoolId: {
          lessonName: updateDto.lessonName,
          schoolId,
        },
      },
      update: {
        status: updateDto.status,
        activeQuizId: updateDto.activeQuizId ?? null,
        examStartedAt,
      },
      create: {
        lessonName: updateDto.lessonName,
        status: updateDto.status,
        activeQuizId: updateDto.activeQuizId,
        examStartedAt,
        schoolId,
      },
    });

    // Instantly broadcast the lockdown/unlock to every connected client in this school's room.
    this.lessonControlGateway.sendLessonStatusUpdate(schoolId, {
      lessonName: lessonControl.lessonName,
      status: lessonControl.status,
      activeQuizId: lessonControl.activeQuizId || undefined,
      examStartedAt: lessonControl.examStartedAt,
    });

    return {
      message: 'Lesson control updated successfully',
      lessonControl: this.serialize(lessonControl),
    };
  }

  // Get all lesson controls for a school (STUDENT + SCHOOL_ADMIN)
  async getLessonControls(schoolId: string) {
    let lessonControls = await this.prisma.lessonControl.findMany({
      where: { schoolId },
      orderBy: { lessonName: 'asc' },
    });

    const allLessons = Object.values(Lesson);

    for (const lesson of allLessons) {
      const existing = lessonControls.find((lc) => lc.lessonName === lesson);
      if (!existing) {
        const newControl = await this.prisma.lessonControl.create({
          data: {
            lessonName: lesson,
            status: LessonStatus.LOCKED,
            schoolId,
          },
        });
        lessonControls.push(newControl);
      }
    }

    // Self-heal: a read should never report a QUIZ_OPEN lesson whose hour has already
    // elapsed, even if the cron hasn't ticked yet.
    lessonControls = await Promise.all(lessonControls.map((lc) => this.expireIfOverdue(lc)));

    lessonControls.sort((a, b) => a.lessonName.localeCompare(b.lessonName));

    return {
      message: 'Lesson controls retrieved successfully',
      lessonControls: lessonControls.map((lc) => this.serialize(lc)),
    };
  }

  // Get lesson control for a specific lesson (used by QuizService to gate submissions)
  async getLessonControl(lessonName: Lesson, schoolId: string): Promise<LessonControl> {
    const lessonControl = await this.prisma.lessonControl.findUnique({
      where: {
        lessonName_schoolId: {
          lessonName,
          schoolId,
        },
      },
    });

    if (!lessonControl) {
      return this.prisma.lessonControl.create({
        data: {
          lessonName,
          status: LessonStatus.LOCKED,
          schoolId,
        },
      });
    }

    return this.expireIfOverdue(lessonControl);
  }

  // 60-Minute Server Countdown: authoritative sweep in case a client never polls again.
  @Cron(CronExpression.EVERY_30_SECONDS)
  async expireOverdueExams() {
    const cutoff = new Date(Date.now() - EXAM_DURATION_MS);

    const overdue = await this.prisma.lessonControl.findMany({
      where: {
        status: LessonStatus.QUIZ_OPEN,
        examStartedAt: { lte: cutoff },
      },
    });

    for (const lessonControl of overdue) {
      await this.lockAndBroadcastExpiry(lessonControl);
    }
  }

  private async expireIfOverdue(lessonControl: LessonControl): Promise<LessonControl> {
    if (
      lessonControl.status !== LessonStatus.QUIZ_OPEN ||
      !lessonControl.examStartedAt ||
      Date.now() - lessonControl.examStartedAt.getTime() < EXAM_DURATION_MS
    ) {
      return lessonControl;
    }

    return this.lockAndBroadcastExpiry(lessonControl);
  }

  private async lockAndBroadcastExpiry(lessonControl: LessonControl): Promise<LessonControl> {
    const updated = await this.prisma.lessonControl.update({
      where: { id: lessonControl.id },
      data: { status: LessonStatus.LOCKED },
    });

    this.lessonControlGateway.sendLessonStatusUpdate(updated.schoolId, {
      lessonName: updated.lessonName,
      status: updated.status,
      activeQuizId: updated.activeQuizId || undefined,
      examStartedAt: updated.examStartedAt,
    });

    this.lessonControlGateway.sendQuizTimeExpired(updated.schoolId, {
      lessonName: updated.lessonName,
      quizId: lessonControl.activeQuizId,
    });

    this.logger.log(`Exam auto-locked after 60 minutes: ${updated.lessonName} (school ${updated.schoolId})`);

    return updated;
  }

  private serialize(lessonControl: LessonControl) {
    const secondsRemaining =
      lessonControl.status === LessonStatus.QUIZ_OPEN && lessonControl.examStartedAt
        ? Math.max(
            0,
            Math.round((EXAM_DURATION_MS - (Date.now() - lessonControl.examStartedAt.getTime())) / 1000),
          )
        : null;

    return {
      ...lessonControl,
      secondsRemaining,
    };
  }
}
