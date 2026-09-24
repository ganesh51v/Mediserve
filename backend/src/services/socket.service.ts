import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';

let io: SocketIOServer | null = null;

export function initSocketIO(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    // console.log(`🔌 Client connected to WebSocket: ${socket.id}`);

    socket.on('join:patient', (patientId: string) => {
      socket.join(`patient:${patientId}`);
    });

    socket.on('join:caretaker', (caretakerId: string) => {
      socket.join(`caretaker:${caretakerId}`);
    });

    socket.on('join:doctor', (doctorId: string) => {
      socket.join(`doctor:${doctorId}`);
    });

    socket.on('disconnect', () => {
      // console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getSocketIO(): SocketIOServer | null {
  return io;
}

export function emitEvent(eventName: string, data: any): void {
  if (io) {
    io.emit(eventName, data);
  }
}

export function emitToPatient(patientId: string, eventName: string, data: any): void {
  if (io) {
    io.to(`patient:${patientId}`).emit(eventName, data);
    // Also emit globally for dashboards monitoring all patients
    io.emit(eventName, data);
  }
}
