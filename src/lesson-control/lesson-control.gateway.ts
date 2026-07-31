import { Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';

interface SocketJwtPayload {
  sub: string;
  email: string;
  username: string;
  role: 'SUPER_ADMIN' | 'SCHOOL_ADMIN' | 'STUDENT';
  schoolId: string | null;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class LessonControlGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(LessonControlGateway.name);

  // Single-session tracking: studentId -> socket.id
  private readonly stdSessions = new Map<string, string>();

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    const token = this.extractToken(client);

    if (!token) {
      this.logger.warn(`Client ${client.id} connected without a token, disconnecting`);
      client.disconnect(true);
      return;
    }

    let payload: SocketJwtPayload;
    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET || 'your-secret-key',
      });
    } catch {
      this.logger.warn(`Client ${client.id} sent an invalid token, disconnecting`);
      client.disconnect(true);
      return;
    }

    client.data.userId = payload.sub;
    client.data.role = payload.role;
    client.data.schoolId = payload.schoolId;

    if (payload.schoolId) {
      client.join(`school_${payload.schoolId}`);
    }

    // Single Session Enforcement: evict any prior connection for this student.
    if (payload.role === 'STUDENT') {
      const previousSocketId = this.stdSessions.get(payload.sub);
      if (previousSocketId && previousSocketId !== client.id) {
        const previousSocket = this.server.sockets.sockets.get(previousSocketId);
        if (previousSocket) {
          previousSocket.emit('forceLogout', {
            reason: 'Your account was signed in from another device.',
          });
          previousSocket.disconnect(true);
        }
      }
      this.stdSessions.set(payload.sub, client.id);
    }

    this.logger.log(`Client connected: ${client.id} (user ${payload.sub}, role ${payload.role})`);
  }

  handleDisconnect(client: Socket) {
    const userId = client.data?.userId as string | undefined;
    if (userId && this.stdSessions.get(userId) === client.id) {
      this.stdSessions.delete(userId);
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinSchoolRoom')
  handleJoinSchoolRoom(@MessageBody() data: { schoolId: string }, @ConnectedSocket() client: Socket) {
    const roomName = `school_${data.schoolId}`;
    client.join(roomName);

    return {
      event: 'joinedRoom',
      data: {
        room: roomName,
        message: 'Successfully joined school room',
      },
    };
  }

  @SubscribeMessage('leaveSchoolRoom')
  handleLeaveSchoolRoom(@MessageBody() data: { schoolId: string }, @ConnectedSocket() client: Socket) {
    const roomName = `school_${data.schoolId}`;
    client.leave(roomName);

    return {
      event: 'leftRoom',
      data: {
        room: roomName,
        message: 'Successfully left school room',
      },
    };
  }

  // Admin Kick: called from AuthService when a School Admin force-logs-out a student.
  forceLogoutStudent(studentId: string): boolean {
    const socketId = this.stdSessions.get(studentId);
    if (!socketId) {
      return false;
    }

    const socket = this.server.sockets.sockets.get(socketId);
    if (socket) {
      socket.emit('forceLogout', {
        reason: 'You have been logged out by your school administrator.',
      });
      socket.disconnect(true);
    }

    this.stdSessions.delete(studentId);
    return true;
  }

  isStudentOnline(studentId: string): boolean {
    return this.stdSessions.has(studentId);
  }

  sendLessonStatusUpdate(
    schoolId: string,
    data: {
      lessonName: string;
      status: string;
      activeQuizId?: string;
      examStartedAt?: Date | null;
    },
  ) {
    const roomName = `school_${schoolId}`;
    this.server.to(roomName).emit('lessonStatusChanged', data);
    this.logger.log(`Broadcasted lessonStatusChanged to ${roomName}: ${JSON.stringify(data)}`);
  }

  // 60-Minute Exam Lockdown: fired by the cron in LessonControlService when time runs out.
  sendQuizTimeExpired(schoolId: string, data: { lessonName: string; quizId: string | null }) {
    const roomName = `school_${schoolId}`;
    this.server.to(roomName).emit('quizTimeExpired', data);
    this.logger.log(`Broadcasted quizTimeExpired to ${roomName}: ${JSON.stringify(data)}`);
  }

  private extractToken(client: Socket): string | null {
    const authPayload = client.handshake.auth as Record<string, string> | undefined;
    const rawAuthToken = authPayload?.authorization || authPayload?.token;
    if (rawAuthToken) {
      return rawAuthToken.startsWith('Bearer ') ? rawAuthToken.slice(7) : rawAuthToken;
    }

    const headerToken = client.handshake.headers.authorization;
    if (headerToken) {
      return headerToken.startsWith('Bearer ') ? headerToken.slice(7) : headerToken;
    }

    return null;
  }
}
