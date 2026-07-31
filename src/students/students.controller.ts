import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Request, BadRequestException, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { Role } from '@prisma/client';

@Controller('students')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StudentsController {
  constructor(private studentsService: StudentsService) {}

  // POST /students - SCHOOL_ADMIN creates within their own school; SUPER_ADMIN must supply schoolId
  @Post()
  @Roles(Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
  async createStudent(@Body() createStudentDto: CreateStudentDto, @Request() req) {
    const schoolId = req.user.role === Role.SUPER_ADMIN ? createStudentDto.schoolId : req.user.schoolId;

    if (!schoolId) {
      throw new BadRequestException('schoolId is required. SUPER_ADMIN must provide schoolId in request body.');
    }

    return this.studentsService.createStudent(createStudentDto, schoolId);
  }

  // GET /students - SCHOOL_ADMIN lists their own school; SUPER_ADMIN must supply schoolId
  @Get()
  @Roles(Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
  async listStudents(@Request() req, @Query('schoolId') schoolId?: string) {
    const targetSchoolId = req.user.role === Role.SUPER_ADMIN ? schoolId : req.user.schoolId;

    if (!targetSchoolId) {
      throw new BadRequestException('schoolId query param is required for SUPER_ADMIN');
    }

    return this.studentsService.listStudents(targetSchoolId);
  }

  // PATCH /students/:id - Update a student (SCHOOL_ADMIN: own school only; SUPER_ADMIN: any)
  @Patch(':id')
  @Roles(Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
  async updateStudent(@Param('id') id: string, @Body() updateStudentDto: UpdateStudentDto, @Request() req) {
    const callerSchoolId = req.user.role === Role.SUPER_ADMIN ? null : req.user.schoolId;
    return this.studentsService.updateStudent(id, updateStudentDto, callerSchoolId);
  }

  // DELETE /students/:id - Remove a student (SCHOOL_ADMIN: own school only; SUPER_ADMIN: any)
  @Delete(':id')
  @Roles(Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async deleteStudent(@Param('id') id: string, @Request() req) {
    const callerSchoolId = req.user.role === Role.SUPER_ADMIN ? null : req.user.schoolId;
    return this.studentsService.deleteStudent(id, callerSchoolId);
  }
}
