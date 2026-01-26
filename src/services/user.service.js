import prisma from "../prisma/connect.prisma.js";
import { buildQueryPrisma } from "../common/helpers/build_query_prisma.js";

export const userService = {
    async getAllUsers(req) {
        // console.log("service findAll", req.payload);
        const { page, pageSize, where, index } = buildQueryPrisma(req.query);

        // prisma
        const resultPrismaPromise = prisma.user.findMany({
            where: where,
            skip: index, // skip tới vị trí index nào (OFFSET)
            take: pageSize, // take lấy bao nhiêu phần tử (LIMIT)
        });

        const totalItemPromise = prisma.user.count({
            where: where,
        });

        const [resultPrisma, totalItem] = await Promise.all([resultPrismaPromise, totalItemPromise]);

        // sequelize
        // const resultSequelize = await Article.findAll();

        return {
            page: page,
            pageSize: pageSize,
            totalItem: totalItem,
            totalPage: Math.ceil(totalItem / pageSize),
            items: resultPrisma,
        };
    },

};
