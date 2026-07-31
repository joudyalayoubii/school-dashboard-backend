import { Injectable, UnauthorizedException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LessonControlGateway } from '../lesson-control/lesson-control.gateway';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private lessonControlGateway: LessonControlGateway,
  ) { }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        password: true,
        role: true,
        schoolId: true,
      },
    });

    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return null;
    }

    const { password: _, ...result } = user;
    return result;
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      schoolId: user.schoolId,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
        schoolId: user.schoolId,
      },
    };
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  // Admin Kick: eject a student's active Qt/socket session from the school admin dashboard.
  // adminSchoolId is null for SUPER_ADMIN, who may eject a student from any school.
  async forceLogout(studentId: string, adminSchoolId: string | null) {
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, name: true, role: true, schoolId: true },
    });

    if (!student || student.role !== Role.STUDENT) {
      throw new NotFoundException('Student not found');
    }

    // Multi-tenancy: a SCHOOL_ADMIN may only eject students that belong to their own school.
    if (adminSchoolId !== null && student.schoolId !== adminSchoolId) {
      throw new ForbiddenException('You can only force-logout students in your own school');
    }

    const ejected = this.lessonControlGateway.forceLogoutStudent(studentId);

    if (!ejected) {
      throw new NotFoundException('This student has no active session');
    }

    return {
      message: `${student.name} has been force-logged out`,
      studentId,
    };
  }
}
