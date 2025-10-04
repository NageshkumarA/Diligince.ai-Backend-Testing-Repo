const Controller = require("../Base/Controller");
const Middleware = require("../../Services/Middleware");
const {
  Notification,
  Conversation,
  Message,
  TrackingData,
  NotificationSettings,
} = require("./Schema");
const WebSocketService = require("../../Services/WebSocketService");
const NotificationService = require("../../Services/NotificationService");
const Email = require("../../Services/Email");
const _ = require("lodash");

class CommunicationController extends Controller {
  constructor() {
    super();
    this.webSocketService = new WebSocketService();
    this.notificationService = new NotificationService();
    this.emailService = new Email();
  }

  // ==================== MESSAGING SYSTEM ====================

  // Get Messages
  async getMessages() {
    try {
      const { conversationId, page = 1, limit = 50 } = this.req.query;
      const userId = this.req.user.id;

      if (!conversationId) {
        return this.res.status(400).send({
          status: false,
          message: "Conversation ID is required",
        });
      }

      // Check if user is participant in conversation
      const conversation = await Conversation.findOne({
        _id: conversationId,
        "participants.userId": userId,
        "participants.isActive": true,
      });

      if (!conversation) {
        return this.res.status(403).send({
          status: false,
          message: "Access denied to this conversation",
        });
      }

      const messages = await Message.find({
        conversationId,
        isDeleted: false,
      })
        .populate("senderId", "email role")
        .populate("replyTo", "content senderId")
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Message.countDocuments({
        conversationId,
        isDeleted: false,
      });

      // Mark messages as delivered
      await Message.updateMany(
        {
          conversationId,
          senderId: { $ne: userId },
          "deliveredTo.userId": { $ne: userId },
        },
        {
          $push: {
            deliveredTo: {
              userId,
              deliveredAt: new Date(),
            },
          },
        }
      );

      this.res.send({
        status: true,
        statusCode: 200,
        message: "Messages retrieved successfully",
        data: {
          messages: messages.reverse(),
          pagination: {
            current: page,
            pages: Math.ceil(total / limit),
            total,
          },
        },
      });
    } catch (error) {
      console.error("Error retrieving messages:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  // Send Message
  async sendMessage() {
    try {
      const {
        conversationId,
        content,
        type = "text",
        replyTo,
        attachments = [],
      } = this.req.body;
      const userId = this.req.user.id;

      // Check if user is participant in conversation
      const conversation = await Conversation.findOne({
        _id: conversationId,
        "participants.userId": userId,
        "participants.isActive": true,
      });

      if (!conversation) {
        return this.res.status(403).send({
          status: false,
          message: "Access denied to this conversation",
        });
      }

      // Create message
      const message = new Message({
        conversationId,
        senderId: userId,
        content,
        type,
        replyTo,
        attachments,
        status: "sent",
      });

      await message.save();
      await message.populate("senderId", "email role");

      // Update conversation last message
      conversation.lastMessage = {
        messageId: message._id,
        content: content.substring(0, 100),
        senderId: userId,
        timestamp: new Date(),
      };
      await conversation.save();

      // Emit to WebSocket
      this.webSocketService.emitToConversation(conversationId, "new_message", {
        message,
        conversation: {
          _id: conversation._id,
          lastMessage: conversation.lastMessage,
        },
      });

      // Send notifications to other participants
      const otherParticipants = conversation.participants.filter(
        (p) => p.userId.toString() !== userId && p.isActive
      );

      for (const participant of otherParticipants) {
        await this.notificationService.send({
          userId: participant.userId,
          title: "New Message",
          message: `You have a new message in ${
            conversation.title || "conversation"
          }`,
          type: "message",
          relatedId: message._id,
          relatedType: "message",
          actionUrl: `/messages/${conversationId}`,
        });
      }

      this.res.send({
        status: true,
        statusCode: 201,
        message: "Message sent successfully",
        data: message,
      });
    } catch (error) {
      console.error("Error sending message:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  // Update Message
  async updateMessage() {
    try {
      const { id } = this.req.params;
      const { content } = this.req.body;
      const userId = this.req.user.id;

      const message = await Message.findOne({
        _id: id,
        senderId: userId,
        isDeleted: false,
      });

      if (!message) {
        return this.res.status(404).send({
          status: false,
          message: "Message not found or access denied",
        });
      }

      // Add to edit history
      message.editHistory.push({
        content: message.content,
        editedAt: new Date(),
      });

      message.content = content;
      message.isEdited = true;
      await message.save();

      // Emit to WebSocket
      this.webSocketService.emitToConversation(
        message.conversationId,
        "message_updated",
        {
          messageId: message._id,
          content,
          isEdited: true,
        }
      );

      this.res.send({
        status: true,
        statusCode: 200,
        message: "Message updated successfully",
        data: message,
      });
    } catch (error) {
      console.error("Error updating message:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  // Delete Message
  async deleteMessage() {
    try {
      const { id } = this.req.params;
      const userId = this.req.user.id;

      const message = await Message.findOne({
        _id: id,
        senderId: userId,
        isDeleted: false,
      });

      if (!message) {
        return this.res.status(404).send({
          status: false,
          message: "Message not found or access denied",
        });
      }

      message.isDeleted = true;
      message.deletedAt = new Date();
      message.deletedBy = userId;
      await message.save();

      // Emit to WebSocket
      this.webSocketService.emitToConversation(
        message.conversationId,
        "message_deleted",
        {
          messageId: message._id,
        }
      );

      this.res.send({
        status: true,
        statusCode: 200,
        message: "Message deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting message:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  // Get Conversations
  async getConversations() {
    try {
      const { page = 1, limit = 20, type } = this.req.query;
      const userId = this.req.user.id;

      const filter = {
        "participants.userId": userId,
        "participants.isActive": true,
        isActive: true,
      };

      if (type) {
        filter.type = type;
      }

      const conversations = await Conversation.find(filter)
        .populate("participants.userId", "email role")
        .populate("lastMessage.senderId", "email role")
        .sort({ "lastMessage.timestamp": -1, updatedAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Conversation.countDocuments(filter);

      // Get unread message counts
      const conversationsWithUnread = await Promise.all(
        conversations.map(async (conv) => {
          const unreadCount = await Message.countDocuments({
            conversationId: conv._id,
            senderId: { $ne: userId },
            "readBy.userId": { $ne: userId },
            isDeleted: false,
          });

          return {
            ...conv.toObject(),
            unreadCount,
          };
        })
      );

      this.res.send({
        status: true,
        statusCode: 200,
        message: "Conversations retrieved successfully",
        data: {
          conversations: conversationsWithUnread,
          pagination: {
            current: page,
            pages: Math.ceil(total / limit),
            total,
          },
        },
      });
    } catch (error) {
      console.error("Error retrieving conversations:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  // Create Conversation
  async createConversation() {
    try {
      const {
        participantIds,
        type = "direct",
        title,
        description,
        relatedId,
        relatedType,
      } = this.req.body;
      const userId = this.req.user.id;

      // Add current user to participants if not included
      const allParticipants = [...new Set([userId, ...participantIds])];

      // For direct conversations, check if one already exists
      if (type === "direct" && allParticipants.length === 2) {
        const existingConversation = await Conversation.findOne({
          type: "direct",
          "participants.userId": { $all: allParticipants },
          participants: { $size: 2 },
          isActive: true,
        });

        if (existingConversation) {
          return this.res.send({
            status: true,
            statusCode: 200,
            message: "Conversation already exists",
            data: existingConversation,
          });
        }
      }

      // Create conversation
      const conversation = new Conversation({
        participants: allParticipants.map((id) => ({
          userId: id,
          role: id === userId ? this.req.user.role : null,
        })),
        type,
        title,
        description,
        relatedId,
        relatedType,
      });

      await conversation.save();
      await conversation.populate("participants.userId", "email role");

      // Emit to WebSocket for all participants
      allParticipants.forEach((participantId) => {
        this.webSocketService.emitToUser(
          participantId,
          "conversation_created",
          conversation
        );
      });

      this.res.send({
        status: true,
        statusCode: 201,
        message: "Conversation created successfully",
        data: conversation,
      });
    } catch (error) {
      console.error("Error creating conversation:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  // Update Conversation
  async updateConversation() {
    try {
      const { id } = this.req.params;
      const { title, description, settings } = this.req.body;
      const userId = this.req.user.id;

      const conversation = await Conversation.findOne({
        _id: id,
        "participants.userId": userId,
        "participants.isActive": true,
      });

      if (!conversation) {
        return this.res.status(404).send({
          status: false,
          message: "Conversation not found or access denied",
        });
      }

      // Update fields
      if (title !== undefined) conversation.title = title;
      if (description !== undefined) conversation.description = description;
      if (settings !== undefined)
        conversation.settings = { ...conversation.settings, ...settings };

      await conversation.save();

      // Emit to WebSocket
      this.webSocketService.emitToConversation(
        id,
        "conversation_updated",
        conversation
      );

      this.res.send({
        status: true,
        statusCode: 200,
        message: "Conversation updated successfully",
        data: conversation,
      });
    } catch (error) {
      console.error("Error updating conversation:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  // Search Messages
  async searchMessages() {
    try {
      const {
        query,
        conversationId,
        type,
        page = 1,
        limit = 20,
      } = this.req.query;
      const userId = this.req.user.id;

      if (!query) {
        return this.res.status(400).send({
          status: false,
          message: "Search query is required",
        });
      }

      // Get user's conversations
      const userConversations = await Conversation.find({
        "participants.userId": userId,
        "participants.isActive": true,
      }).select("_id");

      const conversationIds = userConversations.map((c) => c._id);

      const filter = {
        conversationId: conversationId
          ? conversationId
          : { $in: conversationIds },
        isDeleted: false,
        $text: { $search: query },
      };

      if (type) {
        filter.type = type;
      }

      const messages = await Message.find(filter)
        .populate("senderId", "email role")
        .populate("conversationId", "title type participants")
        .sort({ score: { $meta: "textScore" }, createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Message.countDocuments(filter);

      this.res.send({
        status: true,
        statusCode: 200,
        message: "Messages search completed",
        data: {
          messages,
          pagination: {
            current: page,
            pages: Math.ceil(total / limit),
            total,
          },
        },
      });
    } catch (error) {
      console.error("Error searching messages:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  // Broadcast Message
  async broadcastMessage() {
    try {
      const { title, message, userIds, roles, type = "system" } = this.req.body;
      const senderId = this.req.user.id;

      // Check if user has permission to broadcast
      if (
        !["SuperAdmin", "IndustryAdmin", "Support"].includes(this.req.user.role)
      ) {
        return this.res.status(403).send({
          status: false,
          message: "Insufficient permissions to broadcast messages",
        });
      }

      let targetUsers = [];

      if (userIds && userIds.length > 0) {
        targetUsers = userIds;
      } else if (roles && roles.length > 0) {
        const { UserSchema } = require("../Users/Schema");
        const users = await UserSchema.find({ role: { $in: roles } }).select(
          "_id"
        );
        targetUsers = users.map((u) => u._id);
      }

      if (targetUsers.length === 0) {
        return this.res.status(400).send({
          status: false,
          message: "No target users specified",
        });
      }

      // Send notifications to all target users
      const notifications = await Promise.all(
        targetUsers.map((userId) =>
          this.notificationService.send({
            userId,
            title,
            message,
            type,
            priority: "high",
            channels: {
              inApp: true,
              email: true,
              push: true,
            },
          })
        )
      );

      // Emit to WebSocket
      targetUsers.forEach((userId) => {
        this.webSocketService.emitToUser(userId, "broadcast_message", {
          title,
          message,
          type,
          from: senderId,
        });
      });

      this.res.send({
        status: true,
        statusCode: 200,
        message: "Broadcast message sent successfully",
        data: {
          sentTo: targetUsers.length,
          notifications: notifications.length,
        },
      });
    } catch (error) {
      console.error("Error broadcasting message:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  // Mark Messages as Read
  async markMessagesAsRead() {
    try {
      const { conversationId, messageIds } = this.req.body;
      const userId = this.req.user.id;

      let filter = {
        senderId: { $ne: userId },
        "readBy.userId": { $ne: userId },
        isDeleted: false,
      };

      if (conversationId) {
        filter.conversationId = conversationId;
      }

      if (messageIds && messageIds.length > 0) {
        filter._id = { $in: messageIds };
      }

      const result = await Message.updateMany(filter, {
        $push: {
          readBy: {
            userId,
            readAt: new Date(),
          },
        },
      });

      // Emit to WebSocket
      if (conversationId) {
        this.webSocketService.emitToConversation(
          conversationId,
          "messages_read",
          {
            userId,
            readAt: new Date(),
          }
        );
      }

      this.res.send({
        status: true,
        statusCode: 200,
        message: "Messages marked as read",
        data: {
          modifiedCount: result.modifiedCount,
        },
      });
    } catch (error) {
      console.error("Error marking messages as read:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  // ==================== NOTIFICATION SYSTEM ====================

  // Get Notifications
  async getNotifications() {
    try {
      const {
        page = 1,
        limit = 20,
        unreadOnly = false,
        type,
        priority,
      } = this.req.query;
      const userId = this.req.user.id;

      const filter = { userId };
      if (unreadOnly === "true") {
        filter.read = false;
      }
      if (type) {
        filter.type = type;
      }
      if (priority) {
        filter.priority = priority;
      }

      const notifications = await Notification.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Notification.countDocuments(filter);
      const unreadCount = await Notification.countDocuments({
        userId,
        read: false,
      });

      this.res.send({
        status: true,
        statusCode: 200,
        message: "Notifications retrieved successfully",
        data: {
          notifications,
          pagination: {
            current: page,
            pages: Math.ceil(total / limit),
            total,
          },
          unreadCount,
        },
      });
    } catch (error) {
      console.error("Error retrieving notifications:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  // Create Notification
  async createNotification() {
    try {
      const notificationData = this.req.body;
      const senderId = this.req.user.id;

      // Check permissions
      if (
        !["SuperAdmin", "IndustryAdmin", "Support"].includes(this.req.user.role)
      ) {
        return this.res.status(403).send({
          status: false,
          message: "Insufficient permissions to create notifications",
        });
      }

      const notification = await this.notificationService.send({
        ...notificationData,
        metadata: {
          ...notificationData.metadata,
          createdBy: senderId,
        },
      });

      this.res.send({
        status: true,
        statusCode: 201,
        message: "Notification created successfully",
        data: notification,
      });
    } catch (error) {
      console.error("Error creating notification:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  // Mark Notification as Read
  async markNotificationAsRead() {
    try {
      const { id } = this.req.params;
      const userId = this.req.user.id;

      const notification = await Notification.findOneAndUpdate(
        { _id: id, userId },
        { read: true, readAt: new Date() },
        { new: true }
      );

      if (!notification) {
        return this.res.status(404).send({
          status: false,
          message: "Notification not found",
        });
      }

      // Emit to WebSocket
      this.webSocketService.emitToUser(userId, "notification_read", {
        notificationId: id,
        readAt: new Date(),
      });

      this.res.send({
        status: true,
        statusCode: 200,
        message: "Notification marked as read",
        data: notification,
      });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  // Mark All Notifications as Read
  async markAllNotificationsAsRead() {
    try {
      const userId = this.req.user.id;

      const result = await Notification.updateMany(
        { userId, read: false },
        { read: true, readAt: new Date() }
      );

      // Emit to WebSocket
      this.webSocketService.emitToUser(userId, "all_notifications_read", {
        readAt: new Date(),
        count: result.modifiedCount,
      });

      this.res.send({
        status: true,
        statusCode: 200,
        message: "All notifications marked as read",
        data: {
          modifiedCount: result.modifiedCount,
        },
      });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  // Delete Notification
  async deleteNotification() {
    try {
      const { id } = this.req.params;
      const userId = this.req.user.id;

      const notification = await Notification.findOneAndDelete({
        _id: id,
        userId,
      });

      if (!notification) {
        return this.res.status(404).send({
          status: false,
          message: "Notification not found",
        });
      }

      this.res.send({
        status: true,
        statusCode: 200,
        message: "Notification deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting notification:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  // Get Notification Settings
  async getNotificationSettings() {
    try {
      const userId = this.req.user.id;

      let settings = await NotificationSettings.findOne({ userId });

      if (!settings) {
        // Create default settings
        settings = new NotificationSettings({ userId });
        await settings.save();
      }

      this.res.send({
        status: true,
        statusCode: 200,
        message: "Notification settings retrieved successfully",
        data: settings,
      });
    } catch (error) {
      console.error("Error retrieving notification settings:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  // Update Notification Settings
  async updateNotificationSettings() {
    try {
      const userId = this.req.user.id;
      const settingsData = this.req.body;

      const settings = await NotificationSettings.findOneAndUpdate(
        { userId },
        { ...settingsData },
        { new: true, upsert: true }
      );

      this.res.send({
        status: true,
        statusCode: 200,
        message: "Notification settings updated successfully",
        data: settings,
      });
    } catch (error) {
      console.error("Error updating notification settings:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  // Subscribe to Notifications
  async subscribeToNotifications() {
    try {
      const { type, entityId } = this.req.body;
      const userId = this.req.user.id;

      const settings = await NotificationSettings.findOneAndUpdate(
        { userId },
        {
          $push: {
            subscriptions: {
              type,
              entityId,
              enabled: true,
              subscribedAt: new Date(),
            },
          },
        },
        { new: true, upsert: true }
      );

      this.res.send({
        status: true,
        statusCode: 200,
        message: "Subscribed to notifications successfully",
        data: settings,
      });
    } catch (error) {
      console.error("Error subscribing to notifications:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  // Unsubscribe from Notifications
  async unsubscribeFromNotifications() {
    try {
      const { type, entityId } = this.req.body;
      const userId = this.req.user.id;

      const settings = await NotificationSettings.findOneAndUpdate(
        { userId },
        {
          $pull: {
            subscriptions: { type, entityId },
          },
        },
        { new: true }
      );

      this.res.send({
        status: true,
        statusCode: 200,
        message: "Unsubscribed from notifications successfully",
        data: settings,
      });
    } catch (error) {
      console.error("Error unsubscribing from notifications:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  // ==================== TRACKING SYSTEM ====================

  // Get Tracking Data
  async getTrackingData() {
    try {
      const { trackingId, entityId, entityType, status } = this.req.query;

      let filter = {};
      if (trackingId) filter.trackingId = trackingId;
      if (entityId) filter.entityId = entityId;
      if (entityType) filter.entityType = entityType;
      if (status) filter.status = status;

      const trackingData = await TrackingData.find(filter)
        .populate("assignedTo", "email role")
        .sort({ updatedAt: -1 });

      this.res.send({
        status: true,
        statusCode: 200,
        message: "Tracking data retrieved successfully",
        data: trackingData,
      });
    } catch (error) {
      console.error("Error retrieving tracking data:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  // Update Tracking Data
  async updateTrackingData() {
    try {
      const { trackingId } = this.req.params;
      const updateData = this.req.body;

      const trackingData = await TrackingData.findOneAndUpdate(
        { trackingId },
        {
          ...updateData,
          $push: updateData.currentLocation
            ? {
                route: updateData.currentLocation,
              }
            : {},
        },
        { new: true }
      );

      if (!trackingData) {
        return this.res.status(404).send({
          status: false,
          message: "Tracking data not found",
        });
      }

      // Emit real-time update
      this.webSocketService.emitToRoom(
        `tracking_${trackingId}`,
        "tracking_update",
        trackingData
      );

      // Send notifications for status changes
      if (updateData.status && updateData.status !== trackingData.status) {
        const notification = {
          type: "status_change",
          message: `Status updated to: ${updateData.status}`,
          timestamp: new Date(),
        };

        trackingData.notifications.push(notification);
        await trackingData.save();

        // Notify relevant users
        this.webSocketService.emitToRoom(
          `entity_${trackingData.entityId}`,
          "status_change",
          {
            trackingId,
            status: updateData.status,
            timestamp: new Date(),
          }
        );
      }

      this.res.send({
        status: true,
        statusCode: 200,
        message: "Tracking data updated successfully",
        data: trackingData,
      });
    } catch (error) {
      console.error("Error updating tracking data:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  // Create Tracking Data
  async createTrackingData() {
    try {
      const trackingDataInput = this.req.body;

      // Generate unique tracking ID if not provided
      if (!trackingDataInput.trackingId) {
        trackingDataInput.trackingId = `TRK-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 5)
          .toUpperCase()}`;
      }

      const trackingData = new TrackingData(trackingDataInput);
      await trackingData.save();

      // Emit to WebSocket
      this.webSocketService.emitToRoom(
        `entity_${trackingData.entityId}`,
        "tracking_created",
        trackingData
      );

      this.res.send({
        status: true,
        statusCode: 201,
        message: "Tracking data created successfully",
        data: trackingData,
      });
    } catch (error) {
      console.error("Error creating tracking data:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  // Get Tracking Data by ID
  async getTrackingDataById() {
    try {
      const { trackingId } = this.req.params;

      if (!trackingId) {
        return this.res.status(400).send({
          status: false,
          message: "Tracking ID is required",
        });
      }

      const trackingData = await TrackingData.findOne({ trackingId }).populate(
        "assignedTo",
        "email role"
      );

      if (!trackingData) {
        return this.res.status(404).send({
          status: false,
          message: "Tracking data not found",
        });
      }

      this.res.send({
        status: true,
        statusCode: 200,
        message: "Tracking data retrieved successfully",
        data: trackingData,
      });
    } catch (error) {
      console.error("Error retrieving tracking data by ID:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }
}

module.exports = CommunicationController;
