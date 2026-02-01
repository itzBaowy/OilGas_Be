// prisma/reset.js
import prisma from '../src/prisma/connect.prisma.js';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
    console.log('🗑️  Bắt đầu xóa toàn bộ dữ liệu database...');

    try {
        // Xóa theo thứ tự để tránh lỗi foreign key
        // Xóa BlackListToken
        const deletedBlackListTokens = await prisma.blackListToken.deleteMany({});
        console.log(`✅ Đã xóa ${deletedBlackListTokens.count} BlackListToken`);

        // Xóa LoginHistory
        const deletedLoginHistory = await prisma.loginHistory.deleteMany({});
        console.log(`✅ Đã xóa ${deletedLoginHistory.count} LoginHistory`);

        // Xóa Log
        const deletedLogs = await prisma.log.deleteMany({});
        console.log(`✅ Đã xóa ${deletedLogs.count} Log`);

        // Xóa User
        const deletedUsers = await prisma.user.deleteMany({});
        console.log(`✅ Đã xóa ${deletedUsers.count} User`);

        // Xóa Role
        const deletedRoles = await prisma.role.deleteMany({});
        console.log(`✅ Đã xóa ${deletedRoles.count} Role`);

        console.log('✅ Reset database thành công! Tất cả dữ liệu đã được xóa.');
        console.log('💡 Bạn có thể chạy "node prisma/seed.js" để khởi tạo lại dữ liệu mẫu.');
    } catch (error) {
        console.error('❌ Lỗi khi reset database:', error);
        throw error;
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
