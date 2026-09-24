import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';

let io: SocketIOServer | null = null;

export function initSocketIO(server: HttpServer): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket: Socket) => {
    socket.on('join:patient', (patientId: string) => {
      socket.join(`patient:${patientId}`);
    });

    socket.on('leave:patient', (patientId: string) => {
      socket.leave(`patient:${patientId}`);
    });

    socket.on('join:device', (deviceId: string) => {
      socket.join(`device:${deviceId}`);
    });
  });

  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}

export function notifyDoseUpdate(data: any): void {
  if (io) {
    io.emit('dose:update', data);
    if (data.patientId) {
      io.to(`patient:${data.patientId}`).emit('dose:update', data);
    }
  }
}

export function notifyMealDetected(data: any): void {
  if (io) {
    io.emit('meal:detected', data);
    if (data.patientId) {
      io.to(`patient:${data.patientId}`).emit('meal:detected', data);
    }
  }
}

export function notifyAlertNew(alert: any): void {
  if (io) {
    io.emit('alert:new', alert);
    if (alert.patient_id) {
      io.to(`patient:${alert.patient_id}`).emit('alert:new', alert);
    }
  }
}

export function notifyAlertAcknowledged(alert: any): void {
  if (io) {
    io.emit('alert:acknowledged', alert);
  }
}

export function notifyDeviceUpdate(device: any): void {
  if (io) {
    io.emit('device:update', device);
    if (device.device_id) {
      io.to(`device:${device.device_id}`).emit('device:update', device);
    }
  }
}

export function notifyRefillNeeded(data: any): void {
  if (io) {
    io.emit('refill:needed', data);
  }
}
