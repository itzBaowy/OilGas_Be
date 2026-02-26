import prisma from '../prisma/connect.prisma.js';
import { buildQueryPrisma } from '../common/helpers/build_query_prisma.js';

export const auditLogService = {
  /**
   * Tạo audit log mới
   * @param {Object} auditData - Dữ liệu audit log
   * @param {string} auditData.action - Hành động thực hiện
   * @param {string} auditData.description - Mô tả chi tiết
   * @param {string} [auditData.userId] - ID user thực hiện
   * @param {string} [auditData.userEmail] - Email user
   * @param {string} [auditData.userName] - Tên user
   * @param {string} [auditData.roleName] - Role user
   * @param {string} [auditData.entityType] - Loại entity (USER, EQUIPMENT, etc.)
   * @param {string} [auditData.entityId] - ID entity
   * @param {string} [auditData.entityName] - Tên entity
   * @param {Object} [auditData.oldValues] - Giá trị cũ
   * @param {Object} [auditData.newValues] - Giá trị mới
   * @param {string} [auditData.ipAddress] - IP address
   * @param {Object} [auditData.metadata] - Metadata bổ sung
   */
  async createAuditLog(auditData) {
    try {
      const data = {
        action: auditData.action,
        description: auditData.description,
        userId: auditData.userId || null,
        userEmail: auditData.userEmail || null,
        userName: auditData.userName || null,
        roleName: auditData.roleName || null,
        entityType: auditData.entityType || null,
        entityId: auditData.entityId || null,
        entityName: auditData.entityName || null,
        oldValues: auditData.oldValues ? JSON.stringify(auditData.oldValues) : null,
        newValues: auditData.newValues ? JSON.stringify(auditData.newValues) : null,
        ipAddress: auditData.ipAddress || null,
        metadata: auditData.metadata || null,
      };

      return await prisma.auditLog.create({
        data: data,
      });
    } catch (error) {
      console.error('❌ Failed to create audit log:', error.message);
      throw error;
    }
  },

  async getAuditLogs(req) {
    const { page, pageSize, where, index } = buildQueryPrisma(req.query);

    const resultPrismaPromise = prisma.auditLog.findMany({
      where: where,
      skip: index,
      take: pageSize,
      orderBy: { createdAt: 'desc' }, // Mới nhất trước
    });

    const totalItemPromise = prisma.auditLog.count({
      where: where,
    });

    const [resultPrisma, totalItem] = await Promise.all([resultPrismaPromise, totalItemPromise]);

    return {
      page: page,
      pageSize: pageSize,
      totalItem: totalItem,
      totalPage: Math.ceil(totalItem / pageSize),
      items: resultPrisma,
    };
  },

  async getAuditLogById(req) {
    const { id } = req.params;
    
    const auditLog = await prisma.auditLog.findUnique({
      where: { id },
    });

    // Parse JSON strings back to objects
    if (auditLog) {
      if (auditLog.oldValues) {
        try {
          auditLog.oldValues = JSON.parse(auditLog.oldValues);
        } catch (e) {
          // Keep as string if parse fails
        }
      }
      if (auditLog.newValues) {
        try {
          auditLog.newValues = JSON.parse(auditLog.newValues);
        } catch (e) {
          // Keep as string if parse fails
        }
      }
    }

    return auditLog;
  },

  async deleteAuditLog(req) {
    const { id } = req.params;
    
    return await prisma.auditLog.delete({
      where: { id },
    });
  },

  async getAuditLogsByEntity(entityType, entityId) {
    return await prisma.auditLog.findMany({
      where: {
        entityType: entityType,
        entityId: entityId,
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async getAuditLogsByUser(userId) {
    return await prisma.auditLog.findMany({
      where: {
        userId: userId,
      },
      orderBy: { createdAt: 'desc' },
    });
  },
};
