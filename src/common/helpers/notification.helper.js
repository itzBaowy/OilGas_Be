import { notificationService } from "../../services/notification.service.js";

/**
 * Helper functions để gửi notifications từ các service khác
 */

/**
 * Gửi notification khi tạo user mới
 */
export const notifyUserCreated = async (newUser, creatorId) => {
    try {
        await notificationService.createNotification({
            recipientId: newUser.id,
            title: 'Welcome to Oil & Gas Management System',
            message: `Your account has been created successfully. Your role: ${newUser.role?.name}`,
            type: 'SUCCESS',
            category: 'USER',
            relatedId: newUser.id,
            link: `/profile/overview`,
            createdBy: creatorId,
        });
    } catch (error) {
        console.error('Error sending user created notification:', error);
    }
};

/**
 * Gửi notification khi update user
 */
export const notifyUserUpdated = async (userId, updatedFields, updatedBy) => {
    try {
        const fieldsText = Object.keys(updatedFields).join(', ');
        await notificationService.createNotification({
            recipientId: userId,
            title: 'Account Updated',
            message: `Your account information has been updated: ${fieldsText}`,
            type: 'INFO',
            category: 'USER',
            relatedId: userId,
            link: `/profile/overview`,
            createdBy: updatedBy,
        });
    } catch (error) {
        console.error('Error sending user updated notification:', error);
    }
};

/**
 * Gửi notification khi delete user
 */
export const notifyUserDeleted = async (userId, deletedBy) => {
    try {
        await notificationService.createNotification({
            recipientId: userId,
            title: 'Account Deactivation',
            message: 'Your account will be deactivated shortly. Please contact admin for more information.',
            type: 'WARNING',
            category: 'USER',
            relatedId: userId,
            createdBy: deletedBy,
        });
    } catch (error) {
        console.error('Error sending user deleted notification:', error);
    }
};

/**
 * Gửi notification khi role được update
 */
export const notifyRoleUpdated = async (userIds, roleName, updatedBy) => {
    try {
        await notificationService.createBulkNotifications({
            recipientIds: userIds,
            title: 'Role Permissions Updated',
            message: `Your role "${roleName}" permissions have been updated. Please check your access rights.`,
            type: 'INFO',
            category: 'ROLE',
            link: `/admin/role-permissions`,
            createdBy: updatedBy,
        });
    } catch (error) {
        console.error('Error sending role updated notification:', error);
    }
};

/**
 * Gửi notification khi equipment cần bảo trì
 */
export const notifyMaintenanceRequired = async (recipientIds, equipment) => {
    try {
        await notificationService.createBulkNotifications({
            recipientIds,
            title: 'Maintenance Required',
            message: `Equipment "${equipment.name}" (${equipment.equipmentId}) requires maintenance.`,
            type: 'WARNING',
            category: 'MAINTENANCE',
            relatedId: equipment.id,
            link: `/equipment/${equipment.id}`,
        });
    } catch (error) {
        console.error('Error sending maintenance notification:', error);
    }
};

/**
 * Gửi notification khi inventory thấp
 */
export const notifyLowStock = async (recipientIds, inventory, warehouse) => {
    try {
        await notificationService.createBulkNotifications({
            recipientIds,
            title: 'Low Stock Alert',
            message: `Low stock at ${warehouse.name}: ${inventory.equipment?.name} - Only ${inventory.quantity} units remaining`,
            type: 'WARNING',
            category: 'INVENTORY',
            relatedId: inventory.id,
            link: `/warehouse/${warehouse.id}`,
        });
    } catch (error) {
        console.error('Error sending low stock notification:', error);
    }
};

/**
 * Gửi notification hệ thống
 */
export const notifySystemMessage = async (recipientIds, title, message) => {
    try {
        await notificationService.createBulkNotifications({
            recipientIds,
            title,
            message,
            type: 'SYSTEM',
            category: 'SYSTEM',
        });
    } catch (error) {
        console.error('Error sending system notification:', error);
    }
};
