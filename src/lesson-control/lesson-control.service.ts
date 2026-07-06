import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateLessonControlDto } from './dto/update-lesson-control.dto';
import { Lesson, LessonStatus } from '@prisma/client';
import { LessonControlGateway } from './lesson-control.gateway';

@Injectable()
export class LessonControlService {
  constructor(
    private prisma: PrismaService,
    private lessonControlGateway: LessonControlGateway,
  ) { }

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

    // Upsert lesson control (create if doesn't exist, update if exists)
    const lessonControl = await this.prisma.lessonControl.upsert({
      where: {
        lessonName_schoolId: {
          lessonName: updateDto.lessonName,
          schoolId,
        },
      },
      update: {
        status: updateDto.status,
        activeQuizId: updateDto.activeQuizId,
      },
      create: {
        lessonName: updateDto.lessonName,
        status: updateDto.status,
        activeQuizId: updateDto.activeQuizId,
        schoolId,
      },
    });

    // Broadcast real-time update to all clients in the school's room
    this.lessonControlGateway.sendLessonStatusUpdate(schoolId, {
      lessonName: lessonControl.lessonName,
      status: lessonControl.status,
      activeQuizId: lessonControl.activeQuizId || undefined,
    });

    return {
      message: 'Lesson control updated successfully',
      lessonControl,
    };
  }

  // Get all lesson controls for a school (STUDENT only)
  async getLessonControls(schoolId: string) {
    const lessonControls = await this.prisma.lessonControl.findMany({
      where: { schoolId },
      orderBy: { lessonName: 'asc' },
    });

    // Ensure all 15 lessons have a control record (create missing ones as LOCKED)
    const allLessons: Lesson[] = [
      Lesson.LESSON_1,
      Lesson.LESSON_2,
      Lesson.LESSON_3,
      Lesson.LESSON_4,
      Lesson.LESSON_5,
      Lesson.LESSON_6,
      Lesson.LESSON_7,
      Lesson.LESSON_8,
      Lesson.LESSON_9,
      Lesson.LESSON_10,
      Lesson.LESSON_11,
      Lesson.LESSON_12,
      Lesson.LESSON_13,
      Lesson.LESSON_14,
      Lesson.LESSON_15,
    ];

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

    // Sort by lesson name
    lessonControls.sort((a, b) => a.lessonName.localeCompare(b.lessonName));

    return {
      message: 'Lesson controls retrieved successfully',
      lessonControls,
    };
  }

  // Get lesson control for a specific lesson
  async getLessonControl(lessonName: Lesson, schoolId: string) {
    const lessonControl = await this.prisma.lessonControl.findUnique({
      where: {
        lessonName_schoolId: {
          lessonName,
          schoolId,
        },
      },
    });

    if (!lessonControl) {
      // Create default locked control if not exists
      const newControl = await this.prisma.lessonControl.create({
        data: {
          lessonName,
          status: LessonStatus.LOCKED,
          schoolId,
        },
      });
      return newControl;
    }

    return lessonControl;
  }
}
