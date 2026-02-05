import prisma from "../prisma/connect.prisma.js";
import { BadRequestException } from "../common/helpers/exception.helper.js";
import { buildQueryPrisma } from "../common/helpers/build_query_prisma.js";
import { getIO } from "../common/socket/init.socket.js";
export const notificationService = {
    async createNotification(req) {
        const { recipientId, title, message, type, category, relatedId, link } = req.body;
        const createdBy = req.user?.id;

        if (!recipientId || !title || !message) {
            throw new BadRequestException("recipientId, title, and message are required");
        }

        const recipient = await prisma.user.findUnique({
            where: { id: recipientId },
        });

        if (!recipient) {
            throw new BadRequestException("Recipient user not found");
        }

        // Create notification
        const notification = await prisma.notification.create({
            data: {
                recipientId,
                title,
                message,
                type: type,
                category,
                relatedId,
                link,
                createdBy,
            },
            include: {
                creator: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        avatarCloudId: true,
                    },
                },
            },
        });

        // Emit socket event
        const io = getIO();
        if (io) {
            io.to(recipientId).emit("new_notification", notification);
        }

        return notification;
    },

    async getNotifications(req) {
        const { page, pageSize, where, index } = buildQueryPrisma(req.query);
        const userId = req.user.id;

        const finalWhere = {
            ...where,
            recipientId: userId,
        };

        const [notifications, totalItem] = await Promise.all([
            prisma.notification.findMany({
                where: finalWhere,
                skip: index,
                take: pageSize,
                orderBy: { createdAt: 'desc' },
                include: {
                    creator: {
                        select: {
                            id: true,
                            fullName: true,
                            email: true,
                            avatarCloudId: true,
                        },
                    },
                },
            }),
            prisma.notification.count({ where: finalWhere }),
        ]);

        return {
            page,
            pageSize,
            totalItem,
            totalPage: Math.ceil(totalItem / pageSize),
            items: notifications,
        };
    },

    async getUnreadCount(req) {
        const userId = req.user.id;

        const count = await prisma.notification.count({
            where: {
                recipientId: userId,
                isRead: false,
            },
        });

        return { unreadCount: count };
    },

    /**
     * Gửi notification theo email (không cần permission VIEW_USER)
     */
    async sendNotificationByEmail(req) {
        const { email, title, message, type, category, relatedId, link } = req.body;
        const createdBy = req.user?.id;

        // Validate required fields
        if (!email || !title || !message) {
            throw new BadRequestException("email, title, and message are required");
        }

        // Tìm user theo email
        const recipient = await prisma.user.findUnique({
            where: { email },
            select: { id: true, fullName: true, email: true },
        });

        if (!recipient) {
            throw new BadRequestException(`User not found with email: ${email}`);
        }

        // Create notification
        const notification = await prisma.notification.create({
            data: {
                recipientId: recipient.id,
                title,
                message,
                type: type || "INFO",
                category,
                relatedId,
                link,
                createdBy,
            },
            include: {
                creator: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        avatarCloudId: true,
                    },
                },
            },
        });

        // Emit socket event
        const io = getIO();
        if (io) {
            io.to(recipient.id).emit("new_notification", notification);
        }

        return {
            notification,
            recipient: {
                id: recipient.id,
                fullName: recipient.fullName,
                email: recipient.email,
            },
        };
    },

    async markAsRead(req) {
        const { notificationId } = req.params;
        const userId = req.user.id;

        // Check notification exists and belongs to user
        const notification = await prisma.notification.findUnique({
            where: { id: notificationId },
        });

        if (!notification) {
            throw new BadRequestException("Notification not found");
        }

        if (notification.recipientId !== userId) {
            throw new BadRequestException("Unauthorized to access this notification");
        }

        // Mark as read
        return await prisma.notification.update({
            where: { id: notificationId },
            data: {
                isRead: true,
                readAt: new Date(),
            },
        });
    },

    async markAllAsRead(req) {
        const userId = req.user.id;

        const result = await prisma.notification.updateMany({
            where: {
                recipientId: userId,
                isRead: false,
            },
            data: {
                isRead: true,
                readAt: new Date(),
            },
        });

        return { updated: result.count };
    },

    async deleteNotification(req) {
        const { notificationId } = req.params;
        const userId = req.user.id;

        // Check notification exists and belongs to user
        const notification = await prisma.notification.findUnique({
            where: { id: notificationId },
        });

        if (!notification) {
            throw new BadRequestException("Notification not found");
        }

        if (notification.recipientId !== userId) {
            throw new BadRequestException("Unauthorized to delete this notification");
        }

        await prisma.notification.delete({
            where: { id: notificationId },
        });

        return true;
    },

    async createBulkNotifications(data) {
        const { recipientIds, title, message, type, category, relatedId, link, createdBy } = data;

        const notifications = recipientIds.map(recipientId => ({
            recipientId,
            title,
            message,
            type: type,
            category,
            relatedId,
            link,
            createdBy,
        }));

        const created = await prisma.notification.createMany({
            data: notifications,
        });

        // Emit notifications qua socket
        const io = getIO();
        if (io) {
            recipientIds.forEach(recipientId => {
                io.to(recipientId).emit('new_notification', {
                    title,
                    message,
                    type,
                    category,
                    relatedId,
                    link,
                });
            });
        }

        return { created: created.count };
    },
};
