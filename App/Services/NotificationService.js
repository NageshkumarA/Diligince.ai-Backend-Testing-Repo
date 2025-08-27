const mongoose = require('mongoose');
const { Schema } = mongoose;
const Email = require('./Email');
const Sms = require('./Sms');

// Notification Schema
const notificationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['info', 'success', 'warning', 'error', 'rfq', 'quote', 'approval'], 
    required: true 
  },
  relatedId: { type: Schema.Types.ObjectId },
  relatedType: { 
    type: String, 
    enum: ['requirement', 'rfq', 'quote', 'purchaseOrder'] 
  },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high'], 
    default: 'medium' 
  },
  read: { type: Boolean, default: false },
  readAt: { type: Date },
  actionRequired: { type: Boolean, default: false },
  actionUrl: { type: String },
  metadata: { type: Schema.Types.Mixed }
}, {
  timestamps: true
});

const Notification = mongoose.model('Notification', notificationSchema);

class NotificationService {
  constructor() {
    this.emailService = new Email();
    this.smsService = new Sms();
  }

  async send(notificationData) {
    try {
      // Create notification record
      const notification = new Notification(notificationData);
      await notification.save();

      // Get user preferences
      const user = await mongoose.model('User').findById(notificationData.userId)
        .populate('profileId');

      if (!user) {
        throw new Error('User not found');
      }

      // Send email notification if enabled
      if (user.preferences?.notifications?.email !== false) {
        await this.sendEmailNotification(user, notification);
      }

      // Send SMS notification if enabled and high priority
      if (user.preferences?.notifications?.sms === true && 
          notification.priority === 'high') {
        await this.sendSMSNotification(user, notification);
      }

      return notification;
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }

  async sendEmailNotification(user, notification) {
    try {
      const emailTemplate = this.getEmailTemplate(notification.type);
      const emailContent = emailTemplate.replace('{{title}}', notification.title)
        .replace('{{message}}', notification.message)
        .replace('{{actionUrl}}', notification.actionUrl || '#');

      const mailOptions = {
        to: user.email,
        subject: notification.title,
        html: emailContent
      };

      await this.emailService.send(mailOptions);
    } catch (error) {
      console.error('Error sending email notification:', error);
    }
  }

  async sendSMSNotification(user, notification) {
    try {
      const smsMessage = `${notification.title}: ${notification.message}`;
      await this.smsService.send(user.phone, smsMessage);
    } catch (error) {
      console.error('Error sending SMS notification:', error);
    }
  }

  async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, userId },
        { read: true, readAt: new Date() },
        { new: true }
      );
      return notification;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  async getUserNotifications(userId, options = {}) {
    try {
      const { page = 1, limit = 20, unreadOnly = false } = options;
      
      const filter = { userId };
      if (unreadOnly) {
        filter.read = false;
      }

      const notifications = await Notification.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Notification.countDocuments(filter);
      const unreadCount = await Notification.countDocuments({ userId, read: false });

      return {
        notifications,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        },
        unreadCount
      };
    } catch (error) {
      console.error('Error getting user notifications:', error);
      throw error;
    }
  }

  getEmailTemplate(type) {
    const templates = {
      rfq: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">{{title}}</h2>
          <p>{{message}}</p>
          <a href="{{actionUrl}}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View RFQ</a>
        </div>
      `,
      quote: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #059669;">{{title}}</h2>
          <p>{{message}}</p>
          <a href="{{actionUrl}}" style="background-color: #059669; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Quote</a>
        </div>
      `,
      approval: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">{{title}}</h2>
          <p>{{message}}</p>
          <a href="{{actionUrl}}" style="background-color: #dc2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Take Action</a>
        </div>
      `,
      default: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>{{title}}</h2>
          <p>{{message}}</p>
          <a href="{{actionUrl}}" style="background-color: #6b7280; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Details</a>
        </div>
      `
    };

    return templates[type] || templates.default;
  }
}

module.exports = NotificationService;