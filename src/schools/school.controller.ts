import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Request, BadRequestException, HttpCode, HttpStatus } from '@nestjs/common';
import { IsNotEmpty, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { SchoolService } from './school.service';
import { PrismaService } from '../prisma/prisma.service';

export class CreateSchoolDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class UpdateSchoolDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}

@Controller('schools')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SchoolController {
  constructor(
    private schoolService: SchoolService,
    private prisma: PrismaService,
  ) {}

  // Only SUPER_ADMIN can create a school
  @Post()
  @Roles(Role.SUPER_ADMIN)
  async createSchool(@Body() createSchoolDto: CreateSchoolDto) {
    const school = await this.prisma.school.create({
      data: { name: createSchoolDto.name },
    });

    return {
      message: 'School created successfully',
      school,
    };
  }
  @Get()
  @Roles(Role.SUPER_ADMIN)
  async getSchools() {
    return {
      message: 'Schools retrieved successfully',
      schools: await this.schoolService.getAllSchools(),
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
      lessons: await this.schoolService.getLessonsForSchool(req.user.schoolId),
    };
  }

  // Only SUPER_ADMIN can view all schools
  @Get('all')
  @Roles(Role.SUPER_ADMIN)
  async getAllSchools(@Request() req) {
    return {
      message: 'All schools retrieved successfully',
      requestedBy: req.user.username,
      schools: await this.schoolService.getAllSchools(),
    };
  }

  // SCHOOL_ADMIN can view their own school details; SUPER_ADMIN must specify schoolId
  @Get('details')
  @Roles(Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
  async getSchoolDetails(@Request() req, @Query('schoolId') schoolId?: string) {
    const targetSchoolId = req.user.role === Role.SUPER_ADMIN ? schoolId : req.user.schoolId;

    if (!targetSchoolId) {
      throw new BadRequestException('schoolId query param is required for SUPER_ADMIN');
    }

    const details = await this.schoolService.getSchoolDetails(targetSchoolId);

    return {
      message: 'School details retrieved successfully',
      details,
    };
  }

  // PATCH /schools/:id - Rename a school (SUPER_ADMIN only)
  @Patch(':id')
  @Roles(Role.SUPER_ADMIN)
  async updateSchool(@Param('id') id: string, @Body() updateSchoolDto: UpdateSchoolDto) {
    const school = await this.schoolService.updateSchool(id, updateSchoolDto.name);

    return {
      message: 'School updated successfully',
      school,
    };
  }

  // DELETE /schools/:id - Permanently delete a school and everything in it (SUPER_ADMIN only)
  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async deleteSchool(@Param('id') id: string) {
    await this.schoolService.deleteSchool(id);

    return {
      message: 'School deleted successfully',
    };
  }
}
