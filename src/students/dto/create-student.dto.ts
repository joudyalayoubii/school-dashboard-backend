import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateStudentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  username: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(6, { message: 'password must be at least 6 characters long' })
  password: string;

  // Only honored for SUPER_ADMIN; SCHOOL_ADMIN always creates within their own school.
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  schoolId?: string;
}
