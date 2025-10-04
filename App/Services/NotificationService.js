const { Notification, NotificationSettings } = require('../Modules/Communication/Schema');
const { UserSchema } = require('../Modules/Users/Schema');
const Email = require('./Email');
const WebSocketService = require('./WebSocketService');

class NotificationService {
  constructor() {
    this.emailService = new Email();
    this.webSocketService = new WebSocketService();
  }

  async send(notificationData) {
    try {
      // Get user notification settings
      const settings = await NotificationSettings.findOne({ userId: notificationData.userId });
      
      // Apply user preferences
      const channels = this.applyUserPreferences(notificationData.channels || {}, settings, notificationData.category);
      
      // Check quiet hours
      if (settings && this.isQuietHours(settings)) {
        channels.push = false;
        channels.sms = false;
      }

      // Create notification record
      const notification = new Notification({
        ...notificationData,
        channels,
        status: 'pending'
      });
      await notification.save();

      // Get user details
      const user = await UserSchema.findById(notificationData.userId);

      if (!user) {
        throw new Error('User not found');
      }

      // Send through enabled channels
      const deliveryPromises = [];

      if (channels.inApp) {
        deliveryPromises.push(this.sendInAppNotification(user, notification));
      }

      if (channels.email) {
        deliveryPromises.push(this.sendEmailNotification(user, notification));
      }

      if (channels.sms) {
        deliveryPromises.push(this.sendSMSNotification(user, notification));
      }

      if (channels.push) {
        deliveryPromises.push(this.sendPushNotification(user, notification));
      }

      // Wait for all delivery attempts
      const results = await Promise.allSettled(deliveryPromises);
      
      // Update notification status based on delivery results
      const hasSuccess = results.some(result => result.status === 'fulfilled');
      notification.status = hasSuccess ? 'sent' : 'failed';
      await notification.save();

      return notification;
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }

  applyUserPreferences(requestedChannels, settings, category = 'general') {
    const defaultChannels = {
      inApp: true,
      email: false,
      sms: false,
      push: false
    };

    if (!settings) {
      return { ...defaultChannels, ...requestedChannels };
    }

    const userChannels = settings.categories[category] || settings.channels;
    
    return {
      inApp: requestedChannels.inApp !== undefined ? requestedChannels.inApp && userChannels.inApp : userChannels.inApp,
      email: requestedChannels.email !== undefined ? requestedChannels.email && userChannels.email : userChannels.email,
      sms: requestedChannels.sms !== undefined ? requestedChannels.sms && userChannels.sms : userChannels.sms,
      push: requestedChannels.push !== undefined ? requestedChannels.push && userChannels.push : userChannels.push
    };
  }

  isQuietHours(settings) {
    if (!settings.quietHours.enabled) {
      return false;
    }

    const now = new Date();
    const currentTime = now.toTimeString().substr(0, 5); // HH:MM format
    
    return currentTime >= settings.quietHours.startTime && currentTime <= settings.quietHours.endTime;
  }

  async sendInAppNotification(user, notification) {
    try {
      // Emit to WebSocket for real-time delivery
      this.webSocketService.emitToUser(user._id, 'new_notification', {
        id: notification._id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        priority: notification.priority,
        actionUrl: notification.actionUrl,
        actionText: notification.actionText,
        createdAt: notification.createdAt
      });

      // Update delivery status
      notification.deliveryStatus.inApp = {
        sent: true,
        sentAt: new Date(),
        delivered: true,
        deliveredAt: new Date()
      };

      return true;
    } catch (error) {
      console.error('Error sending in-app notification:', error);
      notification.deliveryStatus.inApp = {
        sent: false,
        error: error.message
      };
      throw error;
    }
  }

  async sendEmailNotification(user, notification) {
    try {
      const emailContent = this.getEmailTemplate(notification.type, {
        title: notification.title,
        message: notification.message,
        actionUrl: notification.actionUrl || '#',
        actionText: notification.actionText || 'View Details'
      });

      const mailOptions = {
        to: user.email,
        subject: notification.title,
        html: emailContent
      };

      await this.emailService.send(mailOptions);
      
      // Update delivery status
      notification.deliveryStatus.email = {
        sent: true,
        sentAt: new Date(),
        delivered: true,
        deliveredAt: new Date()
      };

      return true;
    } catch (error) {
      console.error('Error sending email notification:', error);
      notification.deliveryStatus.email = {
        sent: false,
        error: error.message
      };
      throw error;
    }
  }

  async sendSMSNotification(user, notification) {
    try {
      // SMS implementation would go here
      // For now, we'll simulate SMS sending
      
      const smsContent = `${notification.title}: ${notification.message}`;
      
      // TODO: Implement actual SMS sending using SMS service
      console.log(`SMS to ${user.phone}: ${smsContent}`);
      
      // Update delivery status
      notification.deliveryStatus.sms = {
        sent: true,
        sentAt: new Date(),
        delivered: true,
        deliveredAt: new Date()
      };

      return true;
    } catch (error) {
      console.error('Error sending SMS notification:', error);
      notification.deliveryStatus.sms = {
        sent: false,
        error: error.message
      };
      throw error;
    }
  }

  async sendPushNotification(user, notification) {
    try {
      // Push notification implementation would go here
      // For now, we'll simulate push notification sending
      
      const pushPayload = {
        title: notification.title,
        body: notification.message,
        data: {
          notificationId: notification._id,
          type: notification.type,
          actionUrl: notification.actionUrl
        }
      };
      
      // TODO: Implement actual push notification sending
      console.log(`Push notification to user ${user._id}:`, pushPayload);
      
      // Update delivery status
      notification.deliveryStatus.push = {
        sent: true,
        sentAt: new Date(),
        delivered: true,
        deliveredAt: new Date()
      };

      return true;
    } catch (error) {
      console.error('Error sending push notification:', error);
      notification.deliveryStatus.push = {
        sent: false,
        error: error.message
      };
      throw error;
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

  async sendBulkNotifications(notifications) {
    const results = [];
    
    for (const notificationData of notifications) {
      try {
        const result = await this.send(notificationData);
        results.push({ success: true, notification: result });
      } catch (error) {
        results.push({ success: false, error: error.message, data: notificationData });
      }
    }
    
    return results;
  }

  async sendToRole(role, notificationData) {
    try {
      const users = await UserSchema.find({ role, isActive: true }).select('_id');
      const notifications = users.map(user => ({
        ...notificationData,
        userId: user._id
      }));
      
      return await this.sendBulkNotifications(notifications);
    } catch (error) {
      console.error('Error sending notifications to role:', error);
      throw error;
    }
  }

  async sendToUsers(userIds, notificationData) {
    try {
      const notifications = userIds.map(userId => ({
        ...notificationData,
        userId
      }));
      
      return await this.sendBulkNotifications(notifications);
    } catch (error) {
      console.error('Error sending notifications to users:', error);
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

  async getNotificationStats(userId) {
    try {
      const stats = await Notification.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        {
          $group: {
            _id: '$type',
            total: { $sum: 1 },
            unread: { $sum: { $cond: ['$read', 0, 1] } }
          }
        }
      ]);

      const totalUnread = await Notification.countDocuments({ userId, read: false });
      
      return {
        byType: stats,
        totalUnread
      };
    } catch (error) {
      console.error('Error getting notification stats:', error);
      throw error;
    }
  }

  async cleanupExpiredNotifications() {
    try {
      const result = await Notification.deleteMany({
        expiresAt: { $lt: new Date() }
      });
      
      console.log(`Cleaned up ${result.deletedCount} expired notifications`);
      return result.deletedCount;
    } catch (error) {
      console.error('Error cleaning up expired notifications:', error);
      throw error;
    }
  }

  getEmailTemplate(type, data) {
    const templates = {
      rfq: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">${data.title}</h2>
          <p>${data.message}</p>
          <a href="${data.actionUrl}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">${data.actionText}</a>
        </div>
      `,
      quote: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #059669;">${data.title}</h2>
          <p>${data.message}</p>
          <a href="${data.actionUrl}" style="background-color: #059669; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">${data.actionText}</a>
        </div>
      `,
      approval: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">${data.title}</h2>
          <p>${data.message}</p>
          <a href="${data.actionUrl}" style="background-color: #dc2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">${data.actionText}</a>
        </div>
      `,
      message: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #7c3aed;">${data.title}</h2>
          <p>${data.message}</p>
          <a href="${data.actionUrl}" style="background-color: #7c3aed; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">${data.actionText}</a>
        </div>
      `,
      tracking: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #059669;">${data.title}</h2>
          <p>${data.message}</p>
          <a href="${data.actionUrl}" style="background-color: #059669; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">${data.actionText}</a>
        </div>
      `,
      default: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>${data.title}</h2>
          <p>${data.message}</p>
          <a href="${data.actionUrl}" style="background-color: #6b7280; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">${data.actionText}</a>
        </div>
      `
    };

    return templates[type] || templates.default;
  }
}

module.exports = NotificationService;