# Role-Based Access Control (RBAC) Implementation

This document describes the complete RBAC implementation for the School Dashboard System using NestJS and Prisma.

## Installation Commands

Run these commands to install the required dependencies:

```bash
pnpm add @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt @prisma/client
pnpm add -D @types/bcrypt @types/passport-jwt prisma
```

## Environment Setup

Add the following to your `.env` file:

```env
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
DATABASE_URL=postgresql://user:password@localhost:5432/school_db
```

## Project Structure

```
src/
├── auth/
│   ├── auth.controller.ts       # Login endpoint
│   ├── auth.module.ts           # Auth module configuration
│   ├── auth.service.ts          # Authentication logic with JWT signing
│   ├── guards/
│   │   ├── jwt-auth.guard.ts    # JWT authentication guard
│   │   └── roles.guard.ts       # Role-based access control guard
│   └── strategies/
│       └── jwt.strategy.ts      # Passport JWT strategy
├── common/
│   └── decorators/
│       ├── public.decorator.ts  # Mark public routes (no auth required)
│       └── roles.decorator.ts   # Define allowed roles on endpoints
├── prisma/
│   ├── prisma.module.ts         # Prisma service module
│   └── prisma.service.ts        # Prisma client wrapper
└── school/
    ├── school.controller.ts     # Example controller with RBAC
    └── school.module.ts         # School module
```

## Implementation Details

### 1. Authentication Layer

**File: `src/auth/auth.controller.ts`**
- `POST /auth/login` - Validates username/password and returns JWT token
- Uses `@Public()` decorator to allow unauthenticated access

**File: `src/auth/auth.service.ts`**
- `validateUser()` - Validates credentials using bcrypt
- `login()` - Generates JWT token with user payload (id, role, schoolId)
- `hashPassword()` - Utility for password hashing

### 2. JWT Strategy & Guard

**File: `src/auth/strategies/jwt.strategy.ts`**
- Extends `PassportStrategy` with JWT strategy
- Extracts token from `Authorization: Bearer <token>` header
- Validates user exists in database and populates `req.user`

**File: `src/auth/guards/jwt-auth.guard.ts`**
- Extends `AuthGuard('jwt')`
- Respects `@Public()` decorator for public routes
- Protects routes by requiring valid JWT token

### 3. Roles Decorator

**File: `src/common/decorators/roles.decorator.ts`**
- `@Roles(...)` - Custom decorator using `SetMetadata`
- Accepts one or more `Role` enum values
- Example: `@Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN)`

### 4. Roles Guard

**File: `src/auth/guards/roles.guard.ts`**
- Implements `CanActivate` interface
- Checks if authenticated user's role matches required roles
- Supports multiple roles (OR logic)
- Returns `true` if no roles are specified (public within auth)

### 5. Example Controller

**File: `src/school/school.controller.ts`**

Demonstrates RBAC with the following endpoints:

- **POST /school/create** - Only `SUPER_ADMIN` can create schools
- **POST /school/students** - Only `SCHOOL_ADMIN` can add students
- **GET /school/lessons** - Both `SCHOOL_ADMIN` and `STUDENT` can access lessons
- **GET /school/all** - Only `SUPER_ADMIN` can view all schools
- **GET /school/details** - Only `SCHOOL_ADMIN` can view school details

## Usage Examples

### Basic Usage

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('protected')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProtectedController {
  
  @Get('admin-only')
  @Roles(Role.SUPER_ADMIN)
  adminOnlyEndpoint() {
    return { message: 'Only super admins can access this' };
  }

  @Get('multi-role')
  @Roles(Role.SCHOOL_ADMIN, Role.STUDENT)
  multiRoleEndpoint() {
    return { message: 'School admins and students can access this' };
  }
}
```

### Public Endpoint (No Authentication)

```typescript
import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';

@Controller('public')
export class PublicController {
  
  @Public()
  @Get('health')
  healthCheck() {
    return { status: 'ok' };
  }
}
```

### Accessing User Information

```typescript
@Get('profile')
async getProfile(@Request() req) {
  // req.user contains: { id, username, name, role, schoolId }
  return {
    user: req.user,
    message: `Hello ${req.user.name}, you are a ${req.user.role}`,
  };
}
```

## Testing the Implementation

### 1. Login to get JWT token

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password123"}'
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-id",
    "username": "admin",
    "name": "Admin User",
    "role": "SUPER_ADMIN",
    "schoolId": null
  }
}
```

### 2. Access protected endpoint

```bash
curl http://localhost:3000/school/lessons \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 3. Test role restrictions

Try accessing a SUPER_ADMIN endpoint with a STUDENT token - you'll get a 403 Forbidden error.

## Role Hierarchy

The system supports three roles:

1. **SUPER_ADMIN** - Can create schools, view all schools, manage system-wide settings
2. **SCHOOL_ADMIN** - Can manage their school, add students, view lessons
3. **STUDENT** - Can view lessons, submit quizzes, view their submissions

## Security Notes

1. **JWT Secret**: Always use a strong, random JWT secret in production
2. **Password Hashing**: Passwords are hashed using bcrypt with salt rounds of 10
3. **Token Expiration**: JWT tokens expire after 1 day (configurable in `auth.module.ts`)
4. **HTTPS**: Always use HTTPS in production to protect tokens in transit
5. **Database**: Ensure your database connection is secure

## Database Seeding

To test the system, you'll need to seed your database with test users. Here's an example:

```typescript
// In a seed script
const hashedPassword = await bcrypt.hash('password123', 10);

await prisma.user.create({
  data: {
    username: 'superadmin',
    password: hashedPassword,
    name: 'Super Admin',
    role: 'SUPER_ADMIN',
  },
});

await prisma.user.create({
  data: {
    username: 'schooladmin',
    password: hashedPassword,
    name: 'School Admin',
    role: 'SCHOOL_ADMIN',
    schoolId: 'school-id-here',
  },
});

await prisma.user.create({
  data: {
    username: 'student',
    password: hashedPassword,
    name: 'Student User',
    role: 'STUDENT',
    schoolId: 'school-id-here',
  },
});
```

## Troubleshooting

### "Module '@prisma/client' has no exported member 'Role'"
- Run `npx prisma generate` to regenerate the Prisma client
- Ensure your `prisma/schema.prisma` file is in the correct location

### "UnauthorizedException" on protected routes
- Ensure you're sending the JWT token in the `Authorization: Bearer <token>` header
- Check that the token hasn't expired
- Verify the JWT_SECRET matches between token generation and validation

### 403 Forbidden on role-protected routes
- Check that your user has the required role
- Verify the `@Roles()` decorator is applied correctly
- Ensure both `JwtAuthGuard` and `RolesGuard` are applied

## Next Steps

1. Add refresh token mechanism for better security
2. Implement rate limiting on login endpoint
3. Add password strength validation
4. Implement email verification for new users
5. Add audit logging for sensitive operations
6. Implement role-based permissions at a more granular level (e.g., per-resource)
