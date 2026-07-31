import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { Role } from '@prisma/client';

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService) {}

  // Multi-Tenancy: schoolId is never taken from the request body — always injected
  // from the admin's own JWT payload so an admin can never create a student in another school.
  async createStudent(dto: CreateStudentDto, schoolId: string) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ username: dto.username }, { email: dto.email }] },
      select: { username: true, email: true },
    });

    if (existing) {
      const field = existing.username === dto.username ? 'username' : 'email';
      throw new ConflictException(`A user with this ${field} already exists`);
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const student = await this.prisma.user.create({
      data: {
        name: dto.name,
        username: dto.username,
        email: dto.email,
        password: hashedPassword,
        role: Role.STUDENT,
        schoolId,
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        schoolId: true,
        createdAt: true,
      },
    });

    return {
      message: 'Student created successfully',
      student,
    };
  }

  async listStudents(schoolId: string) {
    const students = await this.prisma.user.findMany({
      where: { schoolId, role: Role.STUDENT },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return { students };
  }

  // callerSchoolId is null for SUPER_ADMIN, who may act on a student in any school.
  private async findOwnedStudent(studentId: string, callerSchoolId: string | null) {
    const student = await this.prisma.user.findUnique({ where: { id: studentId } });

    if (!student || student.role !== Role.STUDENT) {
      throw new NotFoundException('Student not found');
    }

    if (callerSchoolId !== null && student.schoolId !== callerSchoolId) {
      throw new ForbiddenException('You can only manage students in your own school');
    }

    return student;
  }

  async updateStudent(studentId: string, dto: UpdateStudentDto, callerSchoolId: string | null) {
    await this.findOwnedStudent(studentId, callerSchoolId);

    if (dto.username || dto.email) {
      const existing = await this.prisma.user.findFirst({
        where: {
          id: { not: studentId },
          OR: [...(dto.username ? [{ username: dto.username }] : []), ...(dto.email ? [{ email: dto.email }] : [])],
        },
        select: { username: true, email: true },
      });

      if (existing) {
        const field = existing.username === dto.username ? 'username' : 'email';
        throw new ConflictException(`A user with this ${field} already exists`);
      }
    }

    const student = await this.prisma.user.update({
      where: { id: studentId },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.username ? { username: dto.username } : {}),
        ...(dto.email ? { email: dto.email } : {}),
        ...(dto.password ? { password: await bcrypt.hash(dto.password, 10) } : {}),
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        schoolId: true,
        createdAt: true,
      },
    });

    return {
      message: 'Student updated successfully',
      student,
    };
  }

  async deleteStudent(studentId: string, callerSchoolId: string | null) {
    await this.findOwnedStudent(studentId, callerSchoolId);

    // Cascades to submissions (schema onDelete: Cascade).
    await this.prisma.user.delete({ where: { id: studentId } });

    return { message: 'Student deleted successfully' };
  }
}
