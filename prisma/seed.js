// prisma/seed.js
import prisma from '../src/prisma/connect.prisma.js';
import dotenv from 'dotenv';

async function main() {
  console.log('🌱 Đang khởi tạo dữ liệu Role...');

  const roles = [
    { 
      name: 'Admin', 
      permissions: ['ALL'] 
    },
    { 
      name: 'Supervisor', 
      permissions: ['VIEW_ASSET', 'EDIT_ASSET'] 
    },
    { 
      name: 'Engineer', 
      permissions: ['VIEW_SENSOR'] 
    },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
  }
  console.log('✅ Seed data thành công!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });