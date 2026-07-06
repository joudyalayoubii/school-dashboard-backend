import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class LessonControlGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinSchoolRoom')
  handleJoinSchoolRoom(
    @MessageBody() data: { schoolId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const roomName = `school_${data.schoolId}`;
    client.join(roomName);
    console.log(`Client ${client.id} joined room: ${roomName}`);
    
    return {
      event: 'joinedRoom',
      data: {
        room: roomName,
        message: 'Successfully joined school room',
      },
    };
  }

  @SubscribeMessage('leaveSchoolRoom')
  handleLeaveSchoolRoom(
    @MessageBody() data: { schoolId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const roomName = `school_${data.schoolId}`;
    client.leave(roomName);
    console.log(`Client ${client.id} left room: ${roomName}`);
    
    return {
      event: 'leftRoom',
      data: {
        room: roomName,
        message: 'Successfully left school room',
      },
    };
  }

  sendLessonStatusUpdate(schoolId: string, data: {
    lessonName: string;
    status: string;
    activeQuizId?: string;
  }) {
    const roomName = `school_${schoolId}`;
    this.server.to(roomName).emit('lessonStatusChanged', data);
    console.log(`Broadcasted lesson status update to room ${roomName}:`, data);
  }
}
