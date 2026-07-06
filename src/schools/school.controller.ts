import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

export class CreateSchoolDto {
  name: string;
}

export class CreateStudentDto {
  name: string;
  username: string;
  password: string;
}

@Controller('schools')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SchoolController {
  // Only SUPER_ADMIN can create a school
  @Post()
  @Roles(Role.SUPER_ADMIN)
  async createSchool(@Body() createSchoolDto: CreateSchoolDto, @Request() req) {
    return {
      message: 'School created successfully',
      createdBy: req.user.username,
      schoolData: createSchoolDto,
    };
  }
  @Get()
  @Roles(Role.SUPER_ADMIN)
  async getSchools(){
    return{
        

    }
  }

  // Only SCHOOL_ADMIN can add a student
  @Post('students')
  @Roles(Role.SCHOOL_ADMIN)
  async addStudent(@Body() createStudentDto: CreateStudentDto, @Request() req) {
    return {
      message: 'Student added successfully',
      addedBy: req.user.username,
      schoolId: req.user.schoolId,
      studentData: createStudentDto,
    };
  }

  // Both SCHOOL_ADMIN and STUDENT can access lesson resources
  @Get('lessons')
  @Roles(Role.SCHOOL_ADMIN, Role.STUDENT)
  async getLessons(@Request() req) {
    return {
      message: 'Lessons retrieved successfully',
      user: req.user.username,
      role: req.user.role,
      lessons: [
        { id: 1, name: 'Lesson 1', topic: 'Introduction' },
        { id: 2, name: 'Lesson 2', topic: 'Advanced Concepts' },
        { id: 3, name: 'Lesson 3', topic: 'Practical Applications' },
      ],
    };
  }

  // Only SUPER_ADMIN can view all schools
  @Get('all')
  @Roles(Role.SUPER_ADMIN)
  async getAllSchools(@Request() req) {
    return {
      message: 'All schools retrieved successfully',
      requestedBy: req.user.username,
      schools: [
        { id: 1, name: 'School A' },
        { id: 2, name: 'School B' },
      ],
    };
  }

  // SCHOOL_ADMIN can view their own school details
  @Get('details')
  @Roles(Role.SCHOOL_ADMIN)
  async getSchoolDetails(@Request() req) {
    return {
      message: 'School details retrieved successfully',
      schoolId: req.user.schoolId,
      details: {
        id: req.user.schoolId,
        name: 'My School',
        studentCount: 150,
      },
    };
  }
}
