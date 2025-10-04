const mongoose = require('mongoose');
const { Schema } = mongoose;

// Notification Schema
const notificationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['info', 'success', 'warning', 'error', 'rfq', 'quote', 'approval', 'message', 'tracking', 'system'], 
    required: true 
  },
  category: {
    type: String,
    enum: ['general', 'business', 'security', 'system', 'marketing'],
    default: 'general'
  },
  relatedId: { type: Schema.Types.ObjectId },
  relatedType: { 
    type: String, 
    enum: ['requirement', 'rfq', 'quote', 'purchaseOrder', 'message', 'conversation', 'tracking'] 
  },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'urgent'], 
    default: 'medium' 
  },
  channels: {
    inApp: { type: Boolean, default: true },
    email: { type: Boolean, default: false },
    sms: { type: Boolean, default: false },
    push: { type: Boolean, default: false }
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'read', 'failed'],
    default: 'pending'
  },
  read: { type: Boolean, default: false },
  readAt: { type: Date },
  actionRequired: { type: Boolean, default: false },
  actionUrl: { type: String },
  actionText: { type: String },
  expiresAt: { type: Date },
  metadata: { type: Schema.Types.Mixed },
  deliveryStatus: {
    email: {
      sent: { type: Boolean, default: false },
      sentAt: { type: Date },
      delivered: { type: Boolean, default: false },
      deliveredAt: { type: Date },
      error: { type: String }
    },
    sms: {
      sent: { type: Boolean, default: false },
      sentAt: { type: Date },
      delivered: { type: Boolean, default: false },
      deliveredAt: { type: Date },
      error: { type: String }
    },
    push: {
      sent: { type: Boolean, default: false },
      sentAt: { type: Date },
      delivered: { type: Boolean, default: false },
      deliveredAt: { type: Date },
      error: { type: String }
    }
  }
}, {
  timestamps: true
});

// Conversation Schema
const conversationSchema = new Schema({
  participants: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String },
    joinedAt: { type: Date, default: Date.now },
    leftAt: { type: Date },
    isActive: { type: Boolean, default: true }
  }],
  type: {
    type: String,
    enum: ['direct', 'group', 'support', 'business'],
    default: 'direct'
  },
  title: { type: String, trim: true },
  description: { type: String, trim: true },
  relatedId: { type: Schema.Types.ObjectId },
  relatedType: { 
    type: String, 
    enum: ['requirement', 'rfq', 'quote', 'purchaseOrder', 'project'] 
  },
  lastMessage: {
    messageId: { type: Schema.Types.ObjectId, ref: 'Message' },
    content: { type: String },
    senderId: { type: Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date }
  },
  settings: {
    isEncrypted: { type: Boolean, default: false },
    allowFileSharing: { type: Boolean, default: true },
    allowVoiceCall: { type: Boolean, default: true },
    allowVideoCall: { type: Boolean, default: true },
    autoDeleteAfter: { type: Number }, // days
    notificationsEnabled: { type: Boolean, default: true }
  },
  metadata: { type: Schema.Types.Mixed },
  isActive: { type: Boolean, default: true },
  archivedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  mutedBy: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    mutedUntil: { type: Date }
  }]
}, {
  timestamps: true
});

// Message Schema
const messageSchema = new Schema({
  conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
  senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  type: {
    type: String,
    enum: ['text', 'file', 'image', 'voice', 'video', 'location', 'system'],
    default: 'text'
  },
  replyTo: { type: Schema.Types.ObjectId, ref: 'Message' },
  attachments: [{
    name: { type: String, required: true },
    url: { type: String, required: true },
    type: { type: String, required: true },
    size: { type: Number },
    mimeType: { type: String }
  }],
  encryption: {
    isEncrypted: { type: Boolean, default: false },
    encryptedContent: { type: String }, // E2EE encrypted blob
    keyId: { type: String }
  },
  status: {
    type: String,
    enum: ['sending', 'sent', 'delivered', 'read', 'failed'],
    default: 'sending'
  },
  deliveredTo: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    deliveredAt: { type: Date, default: Date.now }
  }],
  readBy: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    readAt: { type: Date, default: Date.now }
  }],
  reactions: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    emoji: { type: String },
    createdAt: { type: Date, default: Date.now }
  }],
  editHistory: [{
    content: { type: String },
    editedAt: { type: Date, default: Date.now }
  }],
  isEdited: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
  deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  metadata: { type: Schema.Types.Mixed }
}, {
  timestamps: true
});

// Tracking Data Schema
const trackingDataSchema = new Schema({
  entityId: { type: Schema.Types.ObjectId, required: true },
  entityType: {
    type: String,
    enum: ['purchaseOrder', 'shipment', 'delivery', 'vehicle', 'personnel'],
    required: true
  },
  trackingId: { type: String, required: true, unique: true },
  status: {
    type: String,
    enum: ['pending', 'in_transit', 'delivered', 'delayed', 'cancelled'],
    default: 'pending'
  },
  currentLocation: {
    latitude: { type: Number },
    longitude: { type: Number },
    address: { type: String },
    city: { type: String },
    state: { type: String },
    country: { type: String },
    timestamp: { type: Date, default: Date.now }
  },
  route: [{
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now },
    speed: { type: Number },
    heading: { type: Number },
    accuracy: { type: Number }
  }],
  milestones: [{
    name: { type: String, required: true },
    description: { type: String },
    location: {
      latitude: { type: Number },
      longitude: { type: Number },
      address: { type: String }
    },
    expectedTime: { type: Date },
    actualTime: { type: Date },
    status: {
      type: String,
      enum: ['pending', 'completed', 'delayed', 'skipped'],
      default: 'pending'
    },
    notes: { type: String }
  }],
  estimatedArrival: { type: Date },
  actualArrival: { type: Date },
  assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
  vehicle: {
    id: { type: String },
    type: { type: String },
    licensePlate: { type: String },
    driver: {
      name: { type: String },
      phone: { type: String },
      license: { type: String }
    }
  },
  notifications: [{
    type: {
      type: String,
      enum: ['status_change', 'location_update', 'milestone_reached', 'delay_alert', 'arrival']
    },
    message: { type: String },
    timestamp: { type: Date, default: Date.now },
    sentTo: [{ type: Schema.Types.ObjectId, ref: 'User' }]
  }],
  isActive: { type: Boolean, default: true },
  metadata: { type: Schema.Types.Mixed }
}, {
  timestamps: true
});

// WebSocket Session Schema
const webSocketSessionSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  socketId: { type: String, required: true },
  deviceId: { type: String },
  deviceType: {
    type: String,
    enum: ['web', 'mobile', 'tablet', 'desktop'],
    default: 'web'
  },
  ipAddress: { type: String },
  userAgent: { type: String },
  isActive: { type: Boolean, default: true },
  lastActivity: { type: Date, default: Date.now },
  connectedAt: { type: Date, default: Date.now },
  disconnectedAt: { type: Date },
  rooms: [{ type: String }], // Socket.io rooms
  metadata: { type: Schema.Types.Mixed }
}, {
  timestamps: true
});

// Notification Settings Schema
const notificationSettingsSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  channels: {
    inApp: { type: Boolean, default: true },
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    push: { type: Boolean, default: true }
  },
  categories: {
    general: {
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: true }
    },
    business: {
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      push: { type: Boolean, default: true }
    },
    security: {
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      push: { type: Boolean, default: true }
    },
    system: {
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: false },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: true }
    },
    marketing: {
      inApp: { type: Boolean, default: false },
      email: { type: Boolean, default: false },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: false }
    }
  },
  quietHours: {
    enabled: { type: Boolean, default: false },
    startTime: { type: String }, // HH:MM format
    endTime: { type: String },   // HH:MM format
    timezone: { type: String, default: 'UTC' }
  },
  frequency: {
    immediate: { type: Boolean, default: true },
    digest: {
      enabled: { type: Boolean, default: false },
      frequency: {
        type: String,
        enum: ['hourly', 'daily', 'weekly'],
        default: 'daily'
      },
      time: { type: String, default: '09:00' } // HH:MM format
    }
  },
  subscriptions: [{
    type: { type: String, required: true },
    entityId: { type: Schema.Types.ObjectId },
    enabled: { type: Boolean, default: true },
    subscribedAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

// Create indexes for performance
notificationSchema.index({ userId: 1, read: 1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ type: 1, priority: 1 });
notificationSchema.index({ relatedId: 1, relatedType: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
notificationSchema.index({ status: 1 });

conversationSchema.index({ 'participants.userId': 1 });
conversationSchema.index({ type: 1, isActive: 1 });
conversationSchema.index({ relatedId: 1, relatedType: 1 });
conversationSchema.index({ 'lastMessage.timestamp': -1 });
conversationSchema.index({ updatedAt: -1 });

messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1 });
messageSchema.index({ type: 1 });
messageSchema.index({ status: 1 });
messageSchema.index({ isDeleted: 1 });
messageSchema.index({ content: 'text' });

trackingDataSchema.index({ trackingId: 1 });
trackingDataSchema.index({ entityId: 1, entityType: 1 });
trackingDataSchema.index({ status: 1, isActive: 1 });
trackingDataSchema.index({ assignedTo: 1 });
trackingDataSchema.index({ 'currentLocation.timestamp': -1 });
trackingDataSchema.index({ estimatedArrival: 1 });

webSocketSessionSchema.index({ userId: 1, isActive: 1 });
webSocketSessionSchema.index({ socketId: 1 });
webSocketSessionSchema.index({ lastActivity: -1 });
webSocketSessionSchema.index({ connectedAt: -1 });

notificationSettingsSchema.index({ userId: 1 });

// Export models
const Notification = mongoose.model('Notification', notificationSchema);
const Conversation = mongoose.model('Conversation', conversationSchema);
const Message = mongoose.model('Message', messageSchema);
const TrackingData = mongoose.model('TrackingData', trackingDataSchema);
const WebSocketSession = mongoose.model('WebSocketSession', webSocketSessionSchema);
const NotificationSettings = mongoose.model('NotificationSettings', notificationSettingsSchema);

module.exports = {
  Notification,
  Conversation,
  Message,
  TrackingData,
  WebSocketSession,
  NotificationSettings
};