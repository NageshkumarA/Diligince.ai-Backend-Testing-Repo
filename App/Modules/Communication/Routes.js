const CommunicationController = require("./Controller");

module.exports = (app, express) => {
  const router = express.Router();
  const Middleware = require("../../Services/Middleware");
  const Validators = require("./Validator");
  const config = require("../../../Configs/Config");

  // ==================== MESSAGING SYSTEM ROUTES ====================

  // Get Messages
  router.get("/messages", Middleware.isUserAuthorized, (req, res) => {
    const controller = new CommunicationController().boot(req, res);
    return controller.getMessages();
  });

  // Send Message
  router.post(
    "/messages",
    Middleware.isUserAuthorized,
    Validators.validateSendMessage(),
    Middleware.validateBody,
    (req, res) => {
      const controller = new CommunicationController().boot(req, res);
      return controller.sendMessage();
    }
  );

  // Update Message
  router.put(
    "/messages/:id",
    Middleware.isUserAuthorized,
    Validators.validateUpdateMessage(),
    Middleware.validateBody,
    (req, res) => {
      const controller = new CommunicationController().boot(req, res);
      return controller.updateMessage();
    }
  );

  // Delete Message
  router.delete("/messages/:id", Middleware.isUserAuthorized, (req, res) => {
    const controller = new CommunicationController().boot(req, res);
    return controller.deleteMessage();
  });

  // Get Conversations
  router.get(
    "/messages/conversations",
    Middleware.isUserAuthorized,
    (req, res) => {
      const controller = new CommunicationController().boot(req, res);
      return controller.getConversations();
    }
  );

  // Create Conversation
  router.post(
    "/messages/conversation",
    Middleware.isUserAuthorized,
    Validators.validateCreateConversation(),
    Middleware.validateBody,
    (req, res) => {
      const controller = new CommunicationController().boot(req, res);
      return controller.createConversation();
    }
  );

  // Update Conversation
  router.put(
    "/messages/conversation/:id",
    Middleware.isUserAuthorized,
    Validators.validateUpdateConversation(),
    Middleware.validateBody,
    (req, res) => {
      const controller = new CommunicationController().boot(req, res);
      return controller.updateConversation();
    }
  );

  // Search Messages
  router.get("/messages/search", Middleware.isUserAuthorized, (req, res) => {
    const controller = new CommunicationController().boot(req, res);
    return controller.searchMessages();
  });

  // Broadcast Message
  router.post(
    "/messages/broadcast",
    Middleware.isUserAuthorized,
    Middleware.requireRole(["SuperAdmin", "IndustryAdmin", "Support"]),
    Validators.validateBroadcastMessage(),
    Middleware.validateBody,
    (req, res) => {
      const controller = new CommunicationController().boot(req, res);
      return controller.broadcastMessage();
    }
  );

  // Mark Messages as Read
  router.post(
    "/messages/mark-read",
    Middleware.isUserAuthorized,
    Validators.validateMarkMessagesRead(),
    Middleware.validateBody,
    (req, res) => {
      const controller = new CommunicationController().boot(req, res);
      return controller.markMessagesAsRead();
    }
  );

  // ==================== NOTIFICATION SYSTEM ROUTES ====================

  // Get Notifications
  router.get("/notifications", Middleware.isUserAuthorized, (req, res) => {
    const controller = new CommunicationController().boot(req, res);
    return controller.getNotifications();
  });

  // Create Notification
  router.post(
    "/notifications",
    Middleware.isUserAuthorized,
    Middleware.requireRole(["SuperAdmin", "IndustryAdmin", "Support"]),
    Validators.validateCreateNotification(),
    Middleware.validateBody,
    (req, res) => {
      const controller = new CommunicationController().boot(req, res);
      return controller.createNotification();
    }
  );

  // Mark Notification as Read
  router.put(
    "/notifications/:id/read",
    Middleware.isUserAuthorized,
    (req, res) => {
      const controller = new CommunicationController().boot(req, res);
      return controller.markNotificationAsRead();
    }
  );

  // Mark All Notifications as Read
  router.put(
    "/notifications/mark-all-read",
    Middleware.isUserAuthorized,
    (req, res) => {
      const controller = new CommunicationController().boot(req, res);
      return controller.markAllNotificationsAsRead();
    }
  );

  // Delete Notification
  router.delete(
    "/notifications/:id",
    Middleware.isUserAuthorized,
    (req, res) => {
      const controller = new CommunicationController().boot(req, res);
      return controller.deleteNotification();
    }
  );

  // Get Notification Settings
  router.get(
    "/notifications/settings",
    Middleware.isUserAuthorized,
    (req, res) => {
      const controller = new CommunicationController().boot(req, res);
      return controller.getNotificationSettings();
    }
  );

  // Update Notification Settings
  router.put(
    "/notifications/settings",
    Middleware.isUserAuthorized,
    Validators.validateNotificationSettings(),
    Middleware.validateBody,
    (req, res) => {
      const controller = new CommunicationController().boot(req, res);
      return controller.updateNotificationSettings();
    }
  );

  // Subscribe to Notifications
  router.post(
    "/notifications/subscribe",
    Middleware.isUserAuthorized,
    Validators.validateNotificationSubscription(),
    Middleware.validateBody,
    (req, res) => {
      const controller = new CommunicationController().boot(req, res);
      return controller.subscribeToNotifications();
    }
  );

  // Unsubscribe from Notifications
  router.delete(
    "/notifications/unsubscribe",
    Middleware.isUserAuthorized,
    Validators.validateNotificationSubscription(),
    Middleware.validateBody,
    (req, res) => {
      const controller = new CommunicationController().boot(req, res);
      return controller.unsubscribeFromNotifications();
    }
  );

  // ==================== TRACKING SYSTEM ROUTES ====================

  // Get Tracking Data
  router.get("/tracking", Middleware.isUserAuthorized, (req, res) => {
    const controller = new CommunicationController().boot(req, res);
    return controller.getTrackingData();
  });

  // Create Tracking Data
  router.post(
    "/tracking",
    Middleware.isUserAuthorized,
    Middleware.requireRole([
      "IndustryAdmin",
      "IndustryMember",
      "Vendor",
      "SuperAdmin",
    ]),
    Validators.validateCreateTracking(),
    Middleware.validateBody,
    (req, res) => {
      const controller = new CommunicationController().boot(req, res);
      return controller.createTrackingData();
    }
  );

  // Update Tracking Data
  router.put(
    "/tracking/:trackingId",
    Middleware.isUserAuthorized,
    Validators.validateUpdateTracking(),
    Middleware.validateBody,
    (req, res) => {
      const controller = new CommunicationController().boot(req, res);
      return controller.updateTrackingData();
    }
  );

  // Get Specific Tracking Data
  router.get(
    "/tracking/:trackingId",
    Middleware.isUserAuthorized,
    (req, res) => {
      const controller = new CommunicationController().boot(req, res);
      return controller.getTrackingDataById();
    }
  );

  app.use(config.baseApiUrl, router);
};
