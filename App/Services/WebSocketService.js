const jwt = require('jsonwebtoken');
const { WebSocketSession } = require('../Modules/Communication/Schema');
const { UserSchema } = require('../Modules/Users/Schema');
const config = require('../../Configs/Config');

class WebSocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> Set of socketIds
    this.socketUsers = new Map(); // socketId -> userId
    this.rooms = new Map(); // roomId -> Set of socketIds
  }

  initialize(server) {
    const { Server } = require('socket.io');
    
    this.io = new Server(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupMiddleware();
    this.setupEventHandlers();
    
    console.log('WebSocket service initialized');
    return this.io;
  }

  setupMiddleware() {
    // JWT Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        // Verify JWT token
        const decoded = jwt.verify(token, config.securityToken);
        
        // Get user details
        const user = await UserSchema.findById(decoded.id).select('-password');
        if (!user || !user.isActive) {
          return next(new Error('User not found or inactive'));
        }

        socket.userId = user._id.toString();
        socket.userRole = user.role;
        socket.userEmail = user.email;
        
        next();
      } catch (error) {
        console.error('WebSocket authentication error:', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  setupEventHandlers() {
    this.io.on('connection', async (socket) => {
      try {
        console.log(`User ${socket.userId} connected with socket ${socket.id}`);
        
        // Store connection
        await this.handleUserConnection(socket);
        
        // Setup event listeners
        this.setupSocketEventListeners(socket);
        
        // Send connection confirmation
        socket.emit('connected', {
          socketId: socket.id,
          userId: socket.userId,
          timestamp: new Date()
        });

        // Notify user's contacts about online status
        this.broadcastUserStatus(socket.userId, 'online');
        
      } catch (error) {
        console.error('Error handling socket connection:', error);
        socket.disconnect();
      }
    });
  }

  async handleUserConnection(socket) {
    const userId = socket.userId;
    const socketId = socket.id;

    // Add to connected users map
    if (!this.connectedUsers.has(userId)) {
      this.connectedUsers.set(userId, new Set());
    }
    this.connectedUsers.get(userId).add(socketId);
    this.socketUsers.set(socketId, userId);

    // Store session in database
    const session = new WebSocketSession({
      userId,
      socketId,
      deviceId: socket.handshake.headers['device-id'] || 'unknown',
      deviceType: socket.handshake.headers['device-type'] || 'web',
      ipAddress: socket.handshake.address,
      userAgent: socket.handshake.headers['user-agent'],
      isActive: true,
      connectedAt: new Date(),
      lastActivity: new Date()
    });

    await session.save();

    // Join user to their personal room
    socket.join(`user_${userId}`);
    
    // Join user to role-based room
    socket.join(`role_${socket.userRole}`);

    // Auto-join relevant rooms based on user's conversations
    await this.joinUserConversations(socket);
  }

  async joinUserConversations(socket) {
    try {
      const { Conversation } = require('../Modules/Communication/Schema');
      
      const conversations = await Conversation.find({
        'participants.userId': socket.userId,
        'participants.isActive': true,
        isActive: true
      }).select('_id');

      conversations.forEach(conv => {
        socket.join(`conversation_${conv._id}`);
      });
    } catch (error) {
      console.error('Error joining user conversations:', error);
    }
  }

  setupSocketEventListeners(socket) {
    // Handle disconnection
    socket.on('disconnect', async () => {
      await this.handleUserDisconnection(socket);
    });

    // Handle joining rooms
    socket.on('join_room', (roomId) => {
      socket.join(roomId);
      socket.emit('joined_room', { roomId, timestamp: new Date() });
    });

    // Handle leaving rooms
    socket.on('leave_room', (roomId) => {
      socket.leave(roomId);
      socket.emit('left_room', { roomId, timestamp: new Date() });
    });

    // Handle typing indicators
    socket.on('typing_start', (data) => {
      socket.to(`conversation_${data.conversationId}`).emit('user_typing', {
        userId: socket.userId,
        conversationId: data.conversationId,
        timestamp: new Date()
      });
    });

    socket.on('typing_stop', (data) => {
      socket.to(`conversation_${data.conversationId}`).emit('user_stopped_typing', {
        userId: socket.userId,
        conversationId: data.conversationId,
        timestamp: new Date()
      });
    });

    // Handle message status updates
    socket.on('message_delivered', (data) => {
      this.emitToUser(data.senderId, 'message_delivery_status', {
        messageId: data.messageId,
        status: 'delivered',
        deliveredTo: socket.userId,
        timestamp: new Date()
      });
    });

    socket.on('message_read', (data) => {
      this.emitToUser(data.senderId, 'message_read_status', {
        messageId: data.messageId,
        status: 'read',
        readBy: socket.userId,
        timestamp: new Date()
      });
    });

    // Handle voice/video call events
    socket.on('call_initiate', (data) => {
      this.handleCallInitiation(socket, data);
    });

    socket.on('call_response', (data) => {
      this.handleCallResponse(socket, data);
    });

    socket.on('call_end', (data) => {
      this.handleCallEnd(socket, data);
    });

    // Handle WebRTC signaling
    socket.on('webrtc_offer', (data) => {
      socket.to(`conversation_${data.conversationId}`).emit('webrtc_offer', {
        ...data,
        from: socket.userId
      });
    });

    socket.on('webrtc_answer', (data) => {
      socket.to(`conversation_${data.conversationId}`).emit('webrtc_answer', {
        ...data,
        from: socket.userId
      });
    });

    socket.on('webrtc_ice_candidate', (data) => {
      socket.to(`conversation_${data.conversationId}`).emit('webrtc_ice_candidate', {
        ...data,
        from: socket.userId
      });
    });

    // Handle location sharing
    socket.on('location_update', (data) => {
      if (data.trackingId) {
        this.emitToRoom(`tracking_${data.trackingId}`, 'location_update', {
          ...data,
          userId: socket.userId,
          timestamp: new Date()
        });
      }
    });

    // Handle activity updates
    socket.on('activity', async () => {
      await this.updateUserActivity(socket.userId);
    });

    // Handle custom events
    socket.on('custom_event', (data) => {
      this.handleCustomEvent(socket, data);
    });
  }

  async handleUserDisconnection(socket) {
    const userId = socket.userId;
    const socketId = socket.id;

    console.log(`User ${userId} disconnected from socket ${socketId}`);

    // Remove from maps
    if (this.connectedUsers.has(userId)) {
      this.connectedUsers.get(userId).delete(socketId);
      if (this.connectedUsers.get(userId).size === 0) {
        this.connectedUsers.delete(userId);
        // User is completely offline
        this.broadcastUserStatus(userId, 'offline');
      }
    }
    this.socketUsers.delete(socketId);

    // Update session in database
    await WebSocketSession.findOneAndUpdate(
      { socketId },
      {
        isActive: false,
        disconnectedAt: new Date()
      }
    );
  }

  async updateUserActivity(userId) {
    await WebSocketSession.updateMany(
      { userId, isActive: true },
      { lastActivity: new Date() }
    );
  }

  broadcastUserStatus(userId, status) {
    this.io.to(`user_${userId}`).emit('user_status_change', {
      userId,
      status,
      timestamp: new Date()
    });
  }

  // Public methods for emitting events

  emitToUser(userId, event, data) {
    this.io.to(`user_${userId}`).emit(event, {
      ...data,
      timestamp: new Date()
    });
  }

  emitToUsers(userIds, event, data) {
    userIds.forEach(userId => {
      this.emitToUser(userId, event, data);
    });
  }

  emitToRoom(roomId, event, data) {
    this.io.to(roomId).emit(event, {
      ...data,
      timestamp: new Date()
    });
  }

  emitToConversation(conversationId, event, data) {
    this.emitToRoom(`conversation_${conversationId}`, event, data);
  }

  emitToRole(role, event, data) {
    this.emitToRoom(`role_${role}`, event, data);
  }

  emitToAll(event, data) {
    this.io.emit(event, {
      ...data,
      timestamp: new Date()
    });
  }

  // Call handling methods

  async handleCallInitiation(socket, data) {
    const { conversationId, type, participants } = data;
    
    const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Emit to all participants except initiator
    participants.forEach(participantId => {
      if (participantId !== socket.userId) {
        this.emitToUser(participantId, 'incoming_call', {
          callId,
          conversationId,
          type,
          initiator: socket.userId,
          participants
        });
      }
    });

    socket.emit('call_initiated', {
      callId,
      conversationId,
      type,
      participants
    });
  }

  async handleCallResponse(socket, data) {
    const { callId, action, conversationId } = data;
    
    // Emit to conversation participants
    this.emitToConversation(conversationId, 'call_response', {
      callId,
      action,
      userId: socket.userId,
      timestamp: new Date()
    });
  }

  async handleCallEnd(socket, data) {
    const { callId, conversationId } = data;
    
    // Emit to conversation participants
    this.emitToConversation(conversationId, 'call_ended', {
      callId,
      endedBy: socket.userId,
      timestamp: new Date()
    });
  }

  handleCustomEvent(socket, data) {
    const { event, payload, target } = data;
    
    if (target) {
      if (target.type === 'user') {
        this.emitToUser(target.id, event, payload);
      } else if (target.type === 'room') {
        this.emitToRoom(target.id, event, payload);
      } else if (target.type === 'conversation') {
        this.emitToConversation(target.id, event, payload);
      }
    }
  }

  // Utility methods

  isUserOnline(userId) {
    return this.connectedUsers.has(userId) && this.connectedUsers.get(userId).size > 0;
  }

  getOnlineUsers() {
    return Array.from(this.connectedUsers.keys());
  }

  getUserSockets(userId) {
    return this.connectedUsers.get(userId) || new Set();
  }

  getSocketUser(socketId) {
    return this.socketUsers.get(socketId);
  }

  async getActiveConnections() {
    return await WebSocketSession.find({ isActive: true })
      .populate('userId', 'email role')
      .sort({ connectedAt: -1 });
  }

  async cleanupInactiveSessions() {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    await WebSocketSession.updateMany(
      {
        isActive: true,
        lastActivity: { $lt: cutoffTime }
      },
      {
        isActive: false,
        disconnectedAt: new Date()
      }
    );
  }
}

module.exports = WebSocketService;