// prisma/seed.js
import prisma from '../src/prisma/connect.prisma.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  console.log('🌱 Đang khởi tạo dữ liệu Role...');

  const roles = [
    {
      name: 'Admin',
      permissions: ['ALL']
    },
    {
      name: 'Supervisor',
      permissions: [
        'VIEW_DASHBOARD',
        'VIEW_AUDIT_LOG',

        'VIEW_ASSET',
        'EDIT_ASSET',
        'VIEW_EQUIPMENT',
        'CREATE_EQUIPMENT',
        'UPDATE_EQUIPMENT',
        'VIEW_INSTRUMENT',
        'UPDATE_INSTRUMENT',

        'VIEW_WAREHOUSE',
        'UPDATE_WAREHOUSE',
        'VIEW_INVENTORY',
        'RECEIVE_INVENTORY',
        'DISPATCH_INVENTORY',

        'VIEW_INCIDENT',
        'HANDLE_INCIDENT',
        'VIEW_MAINTENANCE',
        'ASSIGN_ENGINEER',
        'TRACK_MAINTENANCE',
        'SCHEDULE_EQUIPMENT_MAINTENANCE',
        'ASSIGN_ENGINEER_INSTRUMENT',

        'VIEW_3D_INSTRUMENT',
        'VIEW_OIL_TANK_STATUS',
        'VIEW_OIL_OUTPUT',
        'MONITOR_OIL_OUTPUT',
        'DISPATCH_OIL',

        'VIEW_REPORT',
        'EXPORT_REPORT',
        'VIEW_OFFLINE_DATA',
        'SYNC_OFFLINE_DATA',

        'VIEW_ROLE',
        'CREATE_ROLE',
        'UPDATE_ROLE',
        'MANAGE_PERMISSION'
      ]

    },
    {
      name: 'Engineer',
      permissions: [
        'VIEW_DASHBOARD',

        'VIEW_ASSET',
        'VIEW_EQUIPMENT',
        'VIEW_INSTRUMENT',
        'VIEW_INSTRUMENT_DETAILS',
        'VIEW_EQUIPMENT_MAINTENANCE',
        'VIEW_CONTROL_PANEL',
        'CONTROL_EQUIPMENT',

        'VIEW_3D_INSTRUMENT',
        'INTERACT_3D_INSTRUMENT',
        'VIEW_OIL_TANK_STATUS',
        'VIEW_OIL_OUTPUT',
        'MONITOR_OIL_OUTPUT',

        'VIEW_INCIDENT',
        'ACKNOWLEDGE_ALERT',
        'VIEW_MAINTENANCE',
        'TRACK_MAINTENANCE',

        'VIEW_OFFLINE_DATA',
        'SYNC_OFFLINE_DATA',
        'VIEW_REPORT',
        'EXPORT_REPORT',

        'VIEW_WAREHOUSE',
        'VIEW_INVENTORY'
      ]

    },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
  }
  console.log('✅ Seed Role thành công!');

  console.log('🌱 Đang khởi tạo dữ liệu User...');
  
  // Hash password
  const hashedPassword = await bcrypt.hash('123456', 10);

  // Lấy role IDs
  const adminRole = await prisma.role.findUnique({ where: { name: 'Admin' } });
  const supervisorRole = await prisma.role.findUnique({ where: { name: 'Supervisor' } });
  const engineerRole = await prisma.role.findUnique({ where: { name: 'Engineer' } });

  // Tạo users
  const users = [
    {
      email: 'admin@gmail.com',
      password: hashedPassword,
      fullName: 'Administrator',
      phoneNumber: '0901234567',
      roleId: adminRole.id,
      status: 'ACTIVE',
      isActive: true,
    },
    {
      email: 'supervisor@gmail.com',
      password: hashedPassword,
      fullName: 'Supervisor User',
      phoneNumber: '0901234568',
      roleId: supervisorRole.id,
      status: 'ACTIVE',
      isActive: true,
    },
    {
      email: 'engineer@gmail.com',
      password: hashedPassword,
      fullName: 'Engineer User',
      phoneNumber: '0901234569',
      roleId: engineerRole.id,
      status: 'ACTIVE',
      isActive: true,
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: user,
    });
    console.log(`✅ Tạo user: ${user.email}`);
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