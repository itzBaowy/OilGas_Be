import { auditLogService } from '../../services/auditLog.service.js';

export const logPasswordChange = async (user, ipAddress = null) => {
  try {
    await auditLogService.createAuditLog({
      action: 'CHANGE_PASSWORD',
      description: `${user.fullName} changed password`,
      userId: user.id,
      userEmail: user.email,
      userName: user.fullName,
      roleName: user.role?.name,
      entityType: 'USER',
      entityId: user.id,
      entityName: user.fullName,
      ipAddress: ipAddress,
    });
  } catch (error) {
    console.error('Failed to create audit log for password change:', error.message);
  }
};

export const logEquipmentDelete = async (equipment, user, ipAddress = null) => {
  try {
    await auditLogService.createAuditLog({
      action: 'DELETE_EQUIPMENT',
      description: `${user.role?.name} deleted equipment #${equipment.equipmentId}`,
      userId: user.id,
      userEmail: user.email,
      userName: user.fullName,
      roleName: user.role?.name,
      entityType: 'EQUIPMENT',
      entityId: equipment.id,
      entityName: `Equipment #${equipment.equipmentId}`,
      oldValues: equipment,
      ipAddress: ipAddress,
    });
  } catch (error) {
    console.error('Failed to create audit log for equipment deletion:', error.message);
  }
};

export const logEquipmentCreate = async (equipment, user, ipAddress = null) => {
  try {
    await auditLogService.createAuditLog({
      action: 'CREATE_EQUIPMENT',
      description: `${user.role?.name} created equipment #${equipment.equipmentId}`,
      userId: user.id,
      userEmail: user.email,
      userName: user.fullName,
      roleName: user.role?.name,
      entityType: 'EQUIPMENT',
      entityId: equipment.id,
      entityName: `Equipment #${equipment.equipmentId}`,
      newValues: equipment,
      ipAddress: ipAddress,
    });
  } catch (error) {
    console.error('Failed to create audit log for equipment creation:', error.message);
  }
};

export const logEquipmentUpdate = async (oldEquipment, newEquipment, user, ipAddress = null) => {
  try {
    await auditLogService.createAuditLog({
      action: 'UPDATE_EQUIPMENT',
      description: `${user.role?.name} updated equipment #${newEquipment.equipmentId}`,
      userId: user.id,
      userEmail: user.email,
      userName: user.fullName,
      roleName: user.role?.name,
      entityType: 'EQUIPMENT',
      entityId: newEquipment.id,
      entityName: `Equipment #${newEquipment.equipmentId}`,
      oldValues: oldEquipment,
      newValues: newEquipment,
      ipAddress: ipAddress,
    });
  } catch (error) {
    console.error('Failed to create audit log for equipment update:', error.message);
  }
};

export const logMaintenanceApproval = async (maintenanceId, user, ipAddress = null) => {
  try {
    await auditLogService.createAuditLog({
      action: 'APPROVE_MAINTENANCE',
      description: `${user.role?.name} approved maintenance request #${maintenanceId}`,
      userId: user.id,
      userEmail: user.email,
      userName: user.fullName,
      roleName: user.role?.name,
      entityType: 'MAINTENANCE',
      entityId: maintenanceId,
      entityName: `Maintenance Request #${maintenanceId}`,
      ipAddress: ipAddress,
    });
  } catch (error) {
    console.error('Failed to create audit log for maintenance approval:', error.message);
  }
};

export const logUserCreate = async (newUser, creator, ipAddress = null) => {
  try {
    await auditLogService.createAuditLog({
      action: 'CREATE_USER',
      description: `${creator.role?.name} created user ${newUser.fullName}`,
      userId: creator.id,
      userEmail: creator.email,
      userName: creator.fullName,
      roleName: creator.role?.name,
      entityType: 'USER',
      entityId: newUser.id,
      entityName: newUser.fullName,
      newValues: {
        email: newUser.email,
        fullName: newUser.fullName,
        phoneNumber: newUser.phoneNumber,
        roleId: newUser.roleId,
      },
      ipAddress: ipAddress,
    });
  } catch (error) {
    console.error('Failed to create audit log for user creation:', error.message);
  }
};

export const logUserDelete = async (deletedUser, deleter, ipAddress = null) => {
  try {
    await auditLogService.createAuditLog({
      action: 'DELETE_USER',
      description: `${deleter.role?.name} deleted user ${deletedUser.fullName}`,
      userId: deleter.id,
      userEmail: deleter.email,
      userName: deleter.fullName,
      roleName: deleter.role?.name,
      entityType: 'USER',
      entityId: deletedUser.id,
      entityName: deletedUser.fullName,
      oldValues: {
        email: deletedUser.email,
        fullName: deletedUser.fullName,
        phoneNumber: deletedUser.phoneNumber,
      },
      ipAddress: ipAddress,
    });
  } catch (error) {
    console.error('Failed to create audit log for user deletion:', error.message);
  }
};

export const logUserUpdate = async (oldUser, newUser, updater, ipAddress = null) => {
  try {
    await auditLogService.createAuditLog({
      action: 'UPDATE_USER',
      description: `${updater.role?.name} updated user ${newUser.fullName}`,
      userId: updater.id,
      userEmail: updater.email,
      userName: updater.fullName,
      roleName: updater.role?.name,
      entityType: 'USER',
      entityId: newUser.id,
      entityName: newUser.fullName,
      oldValues: oldUser,
      newValues: newUser,
      ipAddress: ipAddress,
    });
  } catch (error) {
    console.error('Failed to create audit log for user update:', error.message);
  }
};

export const logWarehouseCreate = async (warehouse, user, ipAddress = null) => {
  try {
    await auditLogService.createAuditLog({
      action: 'CREATE_WAREHOUSE',
      description: `${user.role?.name} created warehouse ${warehouse.warehouseId}`,
      userId: user.id,
      userEmail: user.email,
      userName: user.fullName,
      roleName: user.role?.name,
      entityType: 'WAREHOUSE',
      entityId: warehouse.id,
      entityName: warehouse.warehouseId,
      newValues: warehouse,
      ipAddress: ipAddress,
    });
  } catch (error) {
    console.error('Failed to create audit log for warehouse creation:', error.message);
  }
};

export const logWarehouseUpdate = async (oldWarehouse, newWarehouse, user, ipAddress = null) => {
  try {
    await auditLogService.createAuditLog({
      action: 'UPDATE_WAREHOUSE',
      description: `${user.role?.name} updated warehouse ${newWarehouse.warehouseId}`,
      userId: user.id,
      userEmail: user.email,
      userName: user.fullName,
      roleName: user.role?.name,
      entityType: 'WAREHOUSE',
      entityId: newWarehouse.id,
      entityName: newWarehouse.warehouseId,
      oldValues: oldWarehouse,
      newValues: newWarehouse,
      ipAddress: ipAddress,
    });
  } catch (error) {
    console.error('Failed to create audit log for warehouse update:', error.message);
  }
};

export const logWarehouseDelete = async (warehouse, user, ipAddress = null) => {
  try {
    await auditLogService.createAuditLog({
      action: 'DELETE_WAREHOUSE',
      description: `${user.role?.name} deleted warehouse ${warehouse.warehouseId}`,
      userId: user.id,
      userEmail: user.email,
      userName: user.fullName,
      roleName: user.role?.name,
      entityType: 'WAREHOUSE',
      entityId: warehouse.id,
      entityName: warehouse.warehouseId,
      oldValues: warehouse,
      ipAddress: ipAddress,
    });
  } catch (error) {
    console.error('Failed to create audit log for warehouse deletion:', error.message);
  }
};

export const logInventoryMovement = async (inventory, movementType, quantity, user, ipAddress = null) => {
  try {
    const action = movementType === 'RECEIVE' ? 'RECEIVE_INVENTORY' : 'DISPATCH_INVENTORY';
    const description = `${user.role?.name} ${movementType.toLowerCase()}d ${quantity} items for inventory ${inventory.inventoryId}`;
    
    await auditLogService.createAuditLog({
      action: action,
      description: description,
      userId: user.id,
      userEmail: user.email,
      userName: user.fullName,
      roleName: user.role?.name,
      entityType: 'INVENTORY',
      entityId: inventory.id,
      entityName: inventory.inventoryId,
      metadata: {
        movementType: movementType,
        quantity: quantity,
      },
      ipAddress: ipAddress,
    });
  } catch (error) {
    console.error('Failed to create audit log for inventory movement:', error.message);
  }
};


export const createAuditLog = async (auditData) => {
  try {
    await auditLogService.createAuditLog(auditData);
  } catch (error) {
    console.error('Failed to create audit log:', error.message);
  }
};

export const getIpAddress = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() || 
         req.headers['x-real-ip'] || 
         req.ip || 
         req.connection.remoteAddress || 
         'unknown';
};
