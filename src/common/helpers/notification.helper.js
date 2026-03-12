import { notificationService } from "../../services/notification.service.js";

/**
 * Helper functions để gửi notifications từ các service khác
 */
export const notifyUserCreated = async (newUser, creatorId) => {
    try {
        await notificationService.createNotification({
            body: {
                recipientId: newUser.id,
                title: 'Welcome to Oil & Gas Management System',
                message: `Your account has been created successfully. Your role: ${newUser.role?.name}`,
                type: 'SUCCESS',
                category: 'USER',
                relatedId: newUser.id,
                link: `/profile/overview`,
            },
            user: creatorId ? { id: creatorId } : undefined,
        });
    } catch (error) {
        console.error('Error sending user created notification:', error);
    }
};

export const notifyUserUpdated = async (userId, updatedFields, updatedBy) => {
    try {
        const fieldsText = Object.keys(updatedFields).join(', ');
        await notificationService.createNotification({
            body: {
                recipientId: userId,
                title: 'Account Updated',
                message: `Your account information has been updated: ${fieldsText}`,
                type: 'INFO',
                category: 'USER',
                relatedId: userId,
                link: `/profile/overview`,
            },
            user: updatedBy ? { id: updatedBy } : undefined,
        });
    } catch (error) {
        console.error('Error sending user updated notification:', error);
    }
};

export const notifyUserDeleted = async (userId, deletedBy) => {
    try {
        await notificationService.createNotification({
            body: {
                recipientId: userId,
                title: 'Account Deactivation',
                message: 'Your account will be deactivated shortly. Please contact admin for more information.',
                type: 'WARNING',
                category: 'USER',
                relatedId: userId,
            },
            user: deletedBy ? { id: deletedBy } : undefined,
        });
    } catch (error) {
        console.error('Error sending user deleted notification:', error);
    }
};

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

export const notifyMaintenanceScheduled = async (engineerId, equipment, scheduledDate, maintenanceType, scheduledByName) => {
    try {
        const formattedDate = new Date(scheduledDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });

        await notificationService.createNotification({
            body: {
                recipientId: engineerId,
                title: 'Maintenance Assigned',
                message: `You have been assigned ${maintenanceType} maintenance for "${equipment.name}" (${equipment.equipmentId}) scheduled on ${formattedDate}.`,
                type: 'INFO',
                category: 'MAINTENANCE',
                relatedId: equipment.id,
                link: `/maintenance-history`,
            },
            user: scheduledByName ? { id: scheduledByName } : undefined,
        });
    } catch (error) {
        console.error('Error sending maintenance scheduled notification:', error);
    }
};

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

export const notifyWarehouseCapacityExceeded = async (userId, warehouse, requested, available) => {
    try {
        await notificationService.createNotification({
            body: {
                recipientId: userId,
                title: 'Warehouse Capacity Exceeded',
                message: `Cannot receive inventory into "${warehouse.name}" (${warehouse.warehouseId}). ` +
                         `Requested: ${requested} units, Available space: ${available} units. ` +
                         `Capacity: ${warehouse.capacity}.`,
                type: 'ERROR',
                category: 'INVENTORY',
                relatedId: warehouse.id,
                link: `/warehouse`,
            },
            user: { id: userId },
        });
    } catch (error) {
        console.error('Error sending warehouse capacity exceeded notification:', error);
    }
};

export const notifyInventoryReceived = async (userId, warehouse, equipment, quantity, newQuantity) => {
    try {
        await notificationService.createNotification({
            body: {
                recipientId: userId,
                title: 'Inventory Received Successfully',
                message: `Received ${quantity} unit(s) of "${equipment.name}" (${equipment.equipmentId}) ` +
                         `into "${warehouse.name}" (${warehouse.warehouseId}). ` +
                         `New stock: ${newQuantity} unit(s).`,
                type: 'SUCCESS',
                category: 'INVENTORY',
                relatedId: warehouse.id,
                link: `/warehouse`,
            },
            user: { id: userId },
        });
    } catch (error) {
        console.error('Error sending inventory received notification:', error);
    }
};

export const notifyInventoryDispatched = async (userId, warehouse, equipment, quantity, remainingQuantity) => {
    try {
        await notificationService.createNotification({
            body: {
                recipientId: userId,
                title: 'Inventory Dispatched Successfully',
                message: `Dispatched ${quantity} unit(s) of "${equipment.name}" (${equipment.equipmentId}) ` +
                         `from "${warehouse.name}" (${warehouse.warehouseId}). ` +
                         `Remaining stock: ${remainingQuantity} unit(s).`,
                type: 'SUCCESS',
                category: 'INVENTORY',
                relatedId: warehouse.id,
                link: `/warehouse`,
            },
            user: { id: userId },
        });
    } catch (error) {
        console.error('Error sending inventory dispatched notification:', error);
    }
};

export const notifyPasswordExpiring = async (userId, daysLeft) => {
    try {
        await notificationService.createNotification({
            body: {
                recipientId: userId,
                title: 'Password Expiring Soon',
                message: `Your password will expire in ${daysLeft} day(s). Please change your password to maintain account security.`,
                type: 'WARNING',
                category: 'SYSTEM',
                link: '/profile/change-password',
            },
        });
    } catch (error) {
        console.error('Error sending password expiring notification:', error);
    }
};

export const notifyPasswordExpired = async (userId) => {
    try {
        await notificationService.createNotification({
            body: {
                recipientId: userId,
                title: 'Password Expired',
                message: 'Your password has expired. You must change your password to continue using the system.',
                type: 'ERROR',
                category: 'SYSTEM',
                link: '/profile/change-password',
            },
        });
    } catch (error) {
        console.error('Error sending password expired notification:', error);
    }
};

export const notifyAccountDeactivated = async (userId, inactivityDays) => {
    try {
        await notificationService.createNotification({
            body: {
                recipientId: userId,
                title: 'Account Deactivated Due to Inactivity',
                message: `Your account has been automatically deactivated due to ${inactivityDays} days of inactivity. Please contact administrator to reactivate.`,
                type: 'WARNING',
                category: 'SYSTEM',
            },
        });
    } catch (error) {
        console.error('Error sending account deactivated notification:', error);
    }
};

// ===== OIL TRANSACTION NOTIFICATIONS =====

export const notifyOilThreshold = async (userId, instrument, currentVolume, tankCapacity, percentage, alertLevel) => {
    try {
        const roundedPct = Math.round(percentage * 10) / 10;
        let type = 'WARNING';
        let title = '';
        let message = '';

        if (alertLevel === 'CRITICAL') {
            type = 'ERROR';
            title = '🚨 Oil Tank Full - Extraction Stopped';
            message = `Oil tank of "${instrument.name}" (${instrument.instrumentId}) has reached ${roundedPct}% (${currentVolume} / ${tankCapacity} liters). Extraction has been stopped. Please dispatch oil to a warehouse immediately!`;
        } else if (alertLevel === 'HIGH') {
            type = 'WARNING';
            title = '⚠️ Oil Tank Almost Full';
            message = `Oil tank of "${instrument.name}" (${instrument.instrumentId}) has reached ${roundedPct}% (${currentVolume} / ${tankCapacity} liters). Dispatch oil to a warehouse soon!`;
        } else if (alertLevel === 'WARNING') {
            type = 'WARNING';
            title = '🟡 Oil Tank Warning';
            message = `Oil tank of "${instrument.name}" (${instrument.instrumentId}) has reached ${roundedPct}% (${currentVolume} / ${tankCapacity} liters). Prepare to dispatch oil.`;
        }

        await notificationService.createNotification({
            body: {
                recipientId: userId,
                title,
                message,
                type,
                category: 'INVENTORY',
                relatedId: instrument.id,
                link: '/oil/dashboard',
            },
            user: { id: userId },
        });
    } catch (error) {
        console.error('Error sending oil threshold notification:', error);
    }
};

export const notifyOilDispatched = async (userId, instrument, warehouse, quantity, remainingInstrumentOil, newWarehouseOil) => {
    try {
        await notificationService.createNotification({
            body: {
                recipientId: userId,
                title: 'Oil Dispatched Successfully',
                message: `Dispatched ${quantity} liters of oil from "${instrument.name}" (${instrument.instrumentId}) to "${warehouse.name}" (${warehouse.warehouseId}). ` +
                         `Instrument remaining: ${remainingInstrumentOil} liters. Warehouse total: ${newWarehouseOil} liters.`,
                type: 'SUCCESS',
                category: 'INVENTORY',
                relatedId: instrument.id,
                link: '/oil/dashboard',
            },
            user: { id: userId },
        });
    } catch (error) {
        console.error('Error sending oil dispatched notification:', error);
    }
};

export const notifyOilTransferred = async (userId, fromWarehouse, toWarehouse, quantity, fromRemaining, toNew) => {
    try {
        await notificationService.createNotification({
            body: {
                recipientId: userId,
                title: 'Oil Transferred Successfully',
                message: `Transferred ${quantity} liters of oil from "${fromWarehouse.name}" (${fromWarehouse.warehouseId}) to "${toWarehouse.name}" (${toWarehouse.warehouseId}). ` +
                         `Source remaining: ${fromRemaining} liters. Destination total: ${toNew} liters.`,
                type: 'SUCCESS',
                category: 'INVENTORY',
                relatedId: fromWarehouse.id,
                link: '/oil/dashboard',
            },
            user: { id: userId },
        });
    } catch (error) {
        console.error('Error sending oil transferred notification:', error);
    }
};
