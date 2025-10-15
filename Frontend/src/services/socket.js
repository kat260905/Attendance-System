import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
  }

  connect() {
    if (!this.socket) {
      this.socket = io('http://localhost:5000', {
        transports: ['websocket', 'polling'],
      });

      this.socket.on('connect', () => {
        console.log('Connected to server');
        this.isConnected = true;
      });

      this.socket.on('disconnect', () => {
        console.log('Disconnected from server');
        this.isConnected = false;
      });

      this.socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        this.isConnected = false;
      });
    }
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Attendance event listeners
  onAttendanceMarked(callback) {
    if (this.socket) {
      this.socket.on('attendance_marked', callback);
    }
  }

  onAttendanceUpdated(callback) {
    if (this.socket) {
      this.socket.on('attendance_updated', callback);
    }
  }

  // Remove specific event listeners
  offAttendanceMarked(callback) {
    if (this.socket) {
      this.socket.off('attendance_marked', callback);
    }
  }

  offAttendanceUpdated(callback) {
    if (this.socket) {
      this.socket.off('attendance_updated', callback);
    }
  }

  // Emit events
  emit(event, data) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    }
  }

  // Join room for specific session
  joinSession(sessionId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('join_session', { sessionId });
    }
  }

  // Leave room
  leaveSession(sessionId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('leave_session', { sessionId });
    }
  }
}

export default new SocketService();


