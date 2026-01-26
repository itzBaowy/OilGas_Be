import prisma from '../prisma/connect.prisma.js';
import { buildQueryPrisma } from '../common/helpers/build_query_prisma.js';

export const logService = {
  async createLog(logData) {
    return await prisma.log.create({
      data: logData,
    });
  },

  async getLogs(req) {
    const { page, pageSize, where, index } = buildQueryPrisma(req.query);

    const resultPrismaPromise = prisma.log.findMany({
      where: where,
      skip: index,
      take: pageSize,
      orderBy: { createdAt: 'desc' }, // Mới nhất trước
    });

    const totalItemPromise = prisma.log.count({
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

  async getLogById(req) {
    const { id } = req.params;
    
    return await prisma.log.findUnique({
      where: { id },
    });
  },

  async deleteLog(req) {
    const { id } = req.params;
    
    return await prisma.log.delete({
      where: { id },
    });
  },

  async clearOldLogs(daysToKeep = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await prisma.log.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });

    return { deletedCount: result.count };
  },
};
