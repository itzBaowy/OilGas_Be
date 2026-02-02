// prisma/reset.js
import prisma from '../src/prisma/connect.prisma.js';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
    console.log('🗑️  Bắt đầu xóa toàn bộ dữ liệu database...');

    try {
        // Lấy tất cả các model từ Prisma
        const modelNames = Object.keys(prisma).filter(
            (key) => 
                typeof prisma[key] === 'object' && 
                prisma[key] !== null && 
                typeof prisma[key].deleteMany === 'function'
        );

        console.log(`📋 Tìm thấy ${modelNames.length} collections: ${modelNames.join(', ')}`);
        
        let totalDeleted = 0;
        
        // Xóa tất cả models (MongoDB không có foreign key constraint)
        for (const modelName of modelNames) {
            try {
                const deleted = await prisma[modelName].deleteMany({});
                console.log(`✅ Đã xóa ${deleted.count} ${modelName}`);
                totalDeleted += deleted.count;
            } catch (error) {
                console.log(`⚠️  Không thể xóa ${modelName}: ${error.message}`);
            }
        }

        console.log('🎉 ========================================');
        console.log(`✅ Reset database thành công! Đã xóa ${totalDeleted} documents.`);
        console.log('💡 Bạn có thể chạy "node prisma/seed.js" để khởi tạo lại dữ liệu mẫu.');
        console.log('🎉 ========================================');
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
