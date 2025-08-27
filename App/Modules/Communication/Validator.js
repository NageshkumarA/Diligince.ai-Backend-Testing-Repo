const Joi = require("joi");

class CommunicationValidators {
    
    // ==================== MESSAGE VALIDATORS ====================

    static validateSendMessage() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    conversationId: Joi.string().required(),
                    content: Joi.string().trim().required().min(1).max(5000),
                    type: Joi.string().valid('text', 'file', 'image', 'voice', 'video', 'location').default('text'),
                    replyTo: Joi.string().optional(),
                    attachments: Joi.array().items(Joi.object({
                        name: Joi.string().required(),
                        url: Joi.string().uri().required(),
                        type: Joi.string().required(),
                        size: Joi.number().optional(),
                        mimeType: Joi.string().optional()
                    })).optional(),
                    priority: Joi.string().valid('low', 'normal', 'high', 'urgent').default('normal')
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }

    static validateUpdateMessage() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    content: Joi.string().trim().required().min(1).max(5000)
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }

    static validateCreateConversation() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    participantIds: Joi.array().items(Joi.string()).min(1).required(),
                    type: Joi.string().valid('direct', 'group', 'support', 'business').default('direct'),
                    title: Joi.string().trim().max(100).optional(),
                    description: Joi.string().trim().max(500).optional(),
                    relatedId: Joi.string().optional(),
                    relatedType: Joi.string().valid('requirement', 'rfq', 'quote', 'purchaseOrder', 'project').optional()
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }

    static validateUpdateConversation() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    title: Joi.string().trim().max(100).optional(),
                    description: Joi.string().trim().max(500).optional(),
                    settings: Joi.object({
                        isEncrypted: Joi.boolean().optional(),
                        allowFileSharing: Joi.boolean().optional(),
                        allowVoiceCall: Joi.boolean().optional(),
                        allowVideoCall: Joi.boolean().optional(),
                        autoDeleteAfter: Joi.number().min(1).optional(),
                        notificationsEnabled: Joi.boolean().optional()
                    }).optional()
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }

    static validateBroadcastMessage() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    title: Joi.string().trim().required().min(1).max(200),
                    message: Joi.string().trim().required().min(1).max(2000),
                    userIds: Joi.array().items(Joi.string()).optional(),
                    roles: Joi.array().items(Joi.string().valid('SuperAdmin', 'IndustryAdmin', 'IndustryMember', 'Professional', 'Vendor', 'Support')).optional(),
                    type: Joi.string().valid('info', 'success', 'warning', 'error', 'system').default('system'),
                    priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
                    channels: Joi.object({
                        inApp: Joi.boolean().default(true),
                        email: Joi.boolean().default(false),
                        sms: Joi.boolean().default(false),
                        push: Joi.boolean().default(false)
                    }).optional()
                }).or('userIds', 'roles');
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }

    static validateMarkMessagesRead() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    conversationId: Joi.string().optional(),
                    messageIds: Joi.array().items(Joi.string()).optional()
                }).or('conversationId', 'messageIds');
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }

    // ==================== NOTIFICATION VALIDATORS ====================

    static validateCreateNotification() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    userId: Joi.string().required(),
                    title: Joi.string().trim().required().min(1).max(200),
                    message: Joi.string().trim().required().min(1).max(1000),
                    type: Joi.string().valid('info', 'success', 'warning', 'error', 'rfq', 'quote', 'approval', 'message', 'tracking', 'system').required(),
                    category: Joi.string().valid('general', 'business', 'security', 'system', 'marketing').default('general'),
                    relatedId: Joi.string().optional(),
                    relatedType: Joi.string().valid('requirement', 'rfq', 'quote', 'purchaseOrder', 'message', 'conversation', 'tracking').optional(),
                    priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
                    channels: Joi.object({
                        inApp: Joi.boolean().default(true),
                        email: Joi.boolean().default(false),
                        sms: Joi.boolean().default(false),
                        push: Joi.boolean().default(false)
                    }).optional(),
                    actionRequired: Joi.boolean().default(false),
                    actionUrl: Joi.string().uri().optional(),
                    actionText: Joi.string().trim().max(50).optional(),
                    expiresAt: Joi.date().min('now').optional(),
                    metadata: Joi.object().optional()
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }

    static validateNotificationSettings() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    channels: Joi.object({
                        inApp: Joi.boolean().optional(),
                        email: Joi.boolean().optional(),
                        sms: Joi.boolean().optional(),
                        push: Joi.boolean().optional()
                    }).optional(),
                    categories: Joi.object({
                        general: Joi.object({
                            inApp: Joi.boolean().optional(),
                            email: Joi.boolean().optional(),
                            sms: Joi.boolean().optional(),
                            push: Joi.boolean().optional()
                        }).optional(),
                        business: Joi.object({
                            inApp: Joi.boolean().optional(),
                            email: Joi.boolean().optional(),
                            sms: Joi.boolean().optional(),
                            push: Joi.boolean().optional()
                        }).optional(),
                        security: Joi.object({
                            inApp: Joi.boolean().optional(),
                            email: Joi.boolean().optional(),
                            sms: Joi.boolean().optional(),
                            push: Joi.boolean().optional()
                        }).optional(),
                        system: Joi.object({
                            inApp: Joi.boolean().optional(),
                            email: Joi.boolean().optional(),
                            sms: Joi.boolean().optional(),
                            push: Joi.boolean().optional()
                        }).optional(),
                        marketing: Joi.object({
                            inApp: Joi.boolean().optional(),
                            email: Joi.boolean().optional(),
                            sms: Joi.boolean().optional(),
                            push: Joi.boolean().optional()
                        }).optional()
                    }).optional(),
                    quietHours: Joi.object({
                        enabled: Joi.boolean().optional(),
                        startTime: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
                        endTime: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
                        timezone: Joi.string().optional()
                    }).optional(),
                    frequency: Joi.object({
                        immediate: Joi.boolean().optional(),
                        digest: Joi.object({
                            enabled: Joi.boolean().optional(),
                            frequency: Joi.string().valid('hourly', 'daily', 'weekly').optional(),
                            time: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional()
                        }).optional()
                    }).optional()
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }

    static validateNotificationSubscription() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    type: Joi.string().required(),
                    entityId: Joi.string().optional()
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }

    // ==================== TRACKING VALIDATORS ====================

    static validateCreateTracking() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    entityId: Joi.string().required(),
                    entityType: Joi.string().valid('purchaseOrder', 'shipment', 'delivery', 'vehicle', 'personnel').required(),
                    trackingId: Joi.string().optional(),
                    status: Joi.string().valid('pending', 'in_transit', 'delivered', 'delayed', 'cancelled').default('pending'),
                    currentLocation: Joi.object({
                        latitude: Joi.number().min(-90).max(90).required(),
                        longitude: Joi.number().min(-180).max(180).required(),
                        address: Joi.string().optional(),
                        city: Joi.string().optional(),
                        state: Joi.string().optional(),
                        country: Joi.string().optional()
                    }).optional(),
                    milestones: Joi.array().items(Joi.object({
                        name: Joi.string().required(),
                        description: Joi.string().optional(),
                        location: Joi.object({
                            latitude: Joi.number().min(-90).max(90).optional(),
                            longitude: Joi.number().min(-180).max(180).optional(),
                            address: Joi.string().optional()
                        }).optional(),
                        expectedTime: Joi.date().optional(),
                        status: Joi.string().valid('pending', 'completed', 'delayed', 'skipped').default('pending'),
                        notes: Joi.string().optional()
                    })).optional(),
                    estimatedArrival: Joi.date().optional(),
                    assignedTo: Joi.string().optional(),
                    vehicle: Joi.object({
                        id: Joi.string().optional(),
                        type: Joi.string().optional(),
                        licensePlate: Joi.string().optional(),
                        driver: Joi.object({
                            name: Joi.string().optional(),
                            phone: Joi.string().optional(),
                            license: Joi.string().optional()
                        }).optional()
                    }).optional(),
                    metadata: Joi.object().optional()
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }

    static validateUpdateTracking() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    status: Joi.string().valid('pending', 'in_transit', 'delivered', 'delayed', 'cancelled').optional(),
                    currentLocation: Joi.object({
                        latitude: Joi.number().min(-90).max(90).required(),
                        longitude: Joi.number().min(-180).max(180).required(),
                        address: Joi.string().optional(),
                        city: Joi.string().optional(),
                        state: Joi.string().optional(),
                        country: Joi.string().optional(),
                        speed: Joi.number().min(0).optional(),
                        heading: Joi.number().min(0).max(360).optional(),
                        accuracy: Joi.number().min(0).optional()
                    }).optional(),
                    milestones: Joi.array().items(Joi.object({
                        name: Joi.string().required(),
                        description: Joi.string().optional(),
                        location: Joi.object({
                            latitude: Joi.number().min(-90).max(90).optional(),
                            longitude: Joi.number().min(-180).max(180).optional(),
                            address: Joi.string().optional()
                        }).optional(),
                        expectedTime: Joi.date().optional(),
                        actualTime: Joi.date().optional(),
                        status: Joi.string().valid('pending', 'completed', 'delayed', 'skipped').optional(),
                        notes: Joi.string().optional()
                    })).optional(),
                    estimatedArrival: Joi.date().optional(),
                    actualArrival: Joi.date().optional(),
                    vehicle: Joi.object({
                        id: Joi.string().optional(),
                        type: Joi.string().optional(),
                        licensePlate: Joi.string().optional(),
                        driver: Joi.object({
                            name: Joi.string().optional(),
                            phone: Joi.string().optional(),
                            license: Joi.string().optional()
                        }).optional()
                    }).optional(),
                    metadata: Joi.object().optional()
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }

    // ==================== WEBSOCKET VALIDATORS ====================

    static validateWebSocketConnection() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    token: Joi.string().required(),
                    deviceId: Joi.string().optional(),
                    deviceType: Joi.string().valid('web', 'mobile', 'tablet', 'desktop').default('web')
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }

    static validateWebSocketMessage() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    event: Joi.string().required(),
                    data: Joi.object().optional(),
                    room: Joi.string().optional(),
                    to: Joi.string().optional()
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }

    // ==================== VOICE/VIDEO CALL VALIDATORS ====================

    static validateCallInitiation() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    conversationId: Joi.string().required(),
                    type: Joi.string().valid('voice', 'video').required(),
                    participants: Joi.array().items(Joi.string()).min(1).required()
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }

    static validateCallResponse() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    callId: Joi.string().required(),
                    action: Joi.string().valid('accept', 'reject', 'end').required(),
                    reason: Joi.string().optional()
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }

    // ==================== FILE UPLOAD VALIDATORS ====================

    static validateFileUpload() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    conversationId: Joi.string().required(),
                    fileType: Joi.string().valid('image', 'document', 'audio', 'video').required(),
                    fileName: Joi.string().required(),
                    fileSize: Joi.number().max(50 * 1024 * 1024).required(), // 50MB max
                    mimeType: Joi.string().required()
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }

    // ==================== SEARCH VALIDATORS ====================

    static validateMessageSearch() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    query: Joi.string().trim().min(1).max(100).required(),
                    conversationId: Joi.string().optional(),
                    type: Joi.string().valid('text', 'file', 'image', 'voice', 'video', 'location').optional(),
                    dateFrom: Joi.date().optional(),
                    dateTo: Joi.date().min(Joi.ref('dateFrom')).optional(),
                    senderId: Joi.string().optional(),
                    page: Joi.number().min(1).default(1),
                    limit: Joi.number().min(1).max(100).default(20)
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }

    // ==================== REACTION VALIDATORS ====================

    static validateMessageReaction() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    messageId: Joi.string().required(),
                    emoji: Joi.string().required().max(10),
                    action: Joi.string().valid('add', 'remove').default('add')
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }
}

module.exports = CommunicationValidators;