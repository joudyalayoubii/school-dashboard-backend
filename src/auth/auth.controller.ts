import { Controller, Post, Body, Param, HttpCode, HttpStatus, UseGuards, Request } from '@nestjs/common';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { AuthService } from './auth.service';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

@Controller('auth')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.email, loginDto.password);
  }

  // POST /auth/force-logout/:studentId - Admin Kick, ejects the student's live socket session
  @Post('force-logout/:studentId')
  @Roles(Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async forceLogout(@Param('studentId') studentId: string, @Request() req) {
    // SUPER_ADMIN can eject a student from any school; SCHOOL_ADMIN only their own.
    const callerSchoolId = req.user.role === Role.SUPER_ADMIN ? null : req.user.schoolId;
    return this.authService.forceLogout(studentId, callerSchoolId);
  }
}
