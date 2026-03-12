// prisma/seed.js
import prisma from "../src/prisma/connect.prisma.js";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  console.log("🌱 Đang khởi tạo dữ liệu Role...");

  const roles = [
    {
      name: "Admin",
      permissions: ["ALL"],
    },
    {
      name: "Supervisor",
      permissions: [
        "VIEW_DASHBOARD",
        "VIEW_AUDIT_LOG",

        "VIEW_ASSET",
        "EDIT_ASSET",
        "VIEW_EQUIPMENT",
        "CREATE_EQUIPMENT",
        "UPDATE_EQUIPMENT",
        "VIEW_INSTRUMENT",
        "UPDATE_INSTRUMENT",

        "VIEW_WAREHOUSE",
        "UPDATE_WAREHOUSE",
        "VIEW_INVENTORY",
        "RECEIVE_INVENTORY",
        "DISPATCH_INVENTORY",

        "VIEW_INCIDENT",
        "HANDLE_INCIDENT",
        "VIEW_MAINTENANCE",
        "ASSIGN_ENGINEER",
        "TRACK_MAINTENANCE",
        "SCHEDULE_EQUIPMENT_MAINTENANCE",
        "ASSIGN_ENGINEER_INSTRUMENT",

        "VIEW_3D_INSTRUMENT",
        "VIEW_OIL_TANK_STATUS",
        "VIEW_OIL_OUTPUT",
        "MONITOR_OIL_OUTPUT",
        "DISPATCH_OIL",
        "EXTRACT_OIL",
        "TRANSFER_OIL",
        "VIEW_OIL_TRANSACTIONS",

        "VIEW_REPORT",
        "EXPORT_REPORT",
        "VIEW_OFFLINE_DATA",
        "SYNC_OFFLINE_DATA",

        "VIEW_ROLE",
        "CREATE_ROLE",
        "UPDATE_ROLE",
        "MANAGE_PERMISSION",

        "VIEW_WORLD_MAP",
      ],
    },
    {
      name: "Engineer",
      permissions: [
        "VIEW_DASHBOARD",

        "VIEW_ASSET",
        "VIEW_EQUIPMENT",
        "VIEW_INSTRUMENT",
        "VIEW_INSTRUMENT_DETAILS",
        "VIEW_EQUIPMENT_MAINTENANCE",
        "VIEW_CONTROL_PANEL",
        "CONTROL_EQUIPMENT",

        "VIEW_3D_INSTRUMENT",
        "INTERACT_3D_INSTRUMENT",
        "VIEW_OIL_TANK_STATUS",
        "VIEW_OIL_OUTPUT",
        "MONITOR_OIL_OUTPUT",
        "EXTRACT_OIL",
        "VIEW_OIL_TRANSACTIONS",

        "VIEW_INCIDENT",
        "ACKNOWLEDGE_ALERT",
        "VIEW_MAINTENANCE",
        "TRACK_MAINTENANCE",

        "VIEW_OFFLINE_DATA",
        "SYNC_OFFLINE_DATA",
        "VIEW_REPORT",
        "EXPORT_REPORT",

        "VIEW_WAREHOUSE",
        "VIEW_INVENTORY",

        "VIEW_WORLD_MAP",
      ],
    },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
  }
  console.log("✅ Seed Role thành công!");

  console.log("🌱 Đang khởi tạo dữ liệu User...");

  // Hash password
  const hashedPassword = await bcrypt.hash("React001", 10);

  // Lấy role IDs
  const adminRole = await prisma.role.findUnique({ where: { name: "Admin" } });
  const supervisorRole = await prisma.role.findUnique({
    where: { name: "Supervisor" },
  });
  const engineerRole = await prisma.role.findUnique({
    where: { name: "Engineer" },
  });

  // Tạo users
  const teamMembers = [
    "giabao",
    "anhthu",
    "khuongduy",
    "huyhoang",
    "longnhat",
    "thuyvi",
    "duongan",
    "thienphan",
    "chivy",
  ];

  const users = [
    {
      email: "admin@gmail.com",
      password: hashedPassword,
      fullName: "Administrator",
      phoneNumber: "0901234567",
      roleId: adminRole.id,
      status: "ACTIVE",
      isActive: true,
    },
    {
      email: "supervisor@gmail.com",
      password: hashedPassword,
      fullName: "Supervisor User",
      phoneNumber: "0901234568",
      roleId: supervisorRole.id,
      status: "ACTIVE",
      isActive: true,
    },
    {
      email: "engineer@gmail.com",
      password: hashedPassword,
      fullName: "Engineer User",
      phoneNumber: "0901234569",
      roleId: engineerRole.id,
      status: "ACTIVE",
      isActive: true,
    },
  ];

  // Thêm users từ danh sách team members
  let phoneCounter = 1000000;
  teamMembers.forEach((member) => {
    // Tạo tên đầy đủ từ username
    const fullName =
      member.charAt(0).toUpperCase() +
      member.slice(1).replace(/([a-z])([A-Z])/g, "$1 $2");

    // Admin user
    users.push({
      email: `${member}1@gmail.com`,
      password: hashedPassword,
      fullName: `${fullName} (Admin)`,
      phoneNumber: `090${phoneCounter++}`,
      roleId: adminRole.id,
      status: "ACTIVE",
      isActive: true,
    });

    // Supervisor user
    users.push({
      email: `${member}2@gmail.com`,
      password: hashedPassword,
      fullName: `${fullName} (Supervisor)`,
      phoneNumber: `090${phoneCounter++}`,
      roleId: supervisorRole.id,
      status: "ACTIVE",
      isActive: true,
    });

    // Engineer user
    users.push({
      email: `${member}3@gmail.com`,
      password: hashedPassword,
      fullName: `${fullName} (Engineer)`,
      phoneNumber: `090${phoneCounter++}`,
      roleId: engineerRole.id,
      status: "ACTIVE",
      isActive: true,
    });
  });

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: user,
    });
    console.log(`✅ Tạo user: ${user.email}`);
  }

  console.log("✅ Seed User thành công!");

  // Seed Warehouse
  console.log("🌱 Đang khởi tạo dữ liệu Warehouse...");
  const adminUser = await prisma.user.findUnique({
    where: { email: "admin@gmail.com" },
  });

  const warehouses = [
    {
      warehouseId: "WH-001",
      name: "Kho trung tâm",
      location: "Vung Tau, Vietnam",
      capacity: 10000,
      description: "Kho chính lưu trữ thiết bị dầu khí",
      status: "ACTIVE",
      coordinate: { lat: 10.346, lng: 107.084 },
      createdBy: adminUser.id,
      oilCapacity: 100000,
      currentOilVolume: 0,
    },
    {
      warehouseId: "WH-002",
      name: "Kho phụ A",
      location: "Tuy Hoa, Vietnam",
      capacity: 5000,
      description: "Kho phụ khu vực A",
      status: "ACTIVE",
      coordinate: { lat: 12.90820, lng: 109.35791 },
      createdBy: adminUser.id,
      oilCapacity: 50000,
      currentOilVolume: 0,
    },
    {
      warehouseId: "WH-003",
      name: "Kho bảo trì",
      location: "Hai Phong, Vietnam",
      capacity: 3000,
      description: "Kho chuyên dụng cho thiết bị bảo trì",
      status: "MAINTENANCE",
      coordinate: { lat: 20.856, lng: 106.683 },
      createdBy: adminUser.id,
  },
    {
      warehouseId: "WH-004",
      name: "Houston Main Base",
      location: "Houston, USA",
      capacity: 25000,
      description: "North America central distribution hub",
      status: "ACTIVE",
      coordinate: { lat: 29.76043, lng: -95.36980 },
      createdBy: adminUser.id,
    },
    {
      warehouseId: "WH-005",
      name: "Aberdeen Supply Depot",
      location: "Aberdeen, UK",
      capacity: 18000,
      description: "North Sea operations support base",
      status: "ACTIVE",
      coordinate: { lat: 57.14970, lng: -2.09430 },
      createdBy: adminUser.id,
    },
    {
      warehouseId: "WH-006",
      name: "Stavanger Logistics Center",
      location: "Stavanger, Norway",
      capacity: 15000,
      description: "Norwegian continental shelf logistics hub",
      status: "ACTIVE",
      coordinate: { lat: 58.96998, lng: 5.73310 },
      createdBy: adminUser.id,
    },
    {
      warehouseId: "WH-007",
      name: "Dubai Equipment Yard",
      location: "Dubai, UAE",
      capacity: 20000,
      description: "Middle East regional equipment storage",
      status: "ACTIVE",
      coordinate: { lat: 25.27620, lng: 55.29620 },
      createdBy: adminUser.id,
    },
    {
      warehouseId: "WH-008",
      name: "Singapore Marine Base",
      location: "Singapore",
      capacity: 12000,
      description: "Southeast Asia offshore support base",
      status: "ACTIVE",
      coordinate: { lat: 1.26470, lng: 103.82200 },
      createdBy: adminUser.id,
    },
    {
      warehouseId: "WH-009",
      name: "Perth Supply Base",
      location: "Perth, Australia",
      capacity: 14000,
      description: "Western Australia offshore operations hub",
      status: "MAINTENANCE",
      coordinate: { lat: -31.95050, lng: 115.86040 },
      createdBy: adminUser.id,
    },
    {
      warehouseId: "WH-010",
      name: "Rio de Janeiro Depot",
      location: "Rio de Janeiro, Brazil",
      capacity: 22000,
      description: "Pre-salt basin operations support center",
      status: "ACTIVE",
      coordinate: { lat: -22.90680, lng: -43.17290 },
      createdBy: adminUser.id,
    },
    {
      warehouseId: "WH-011",
      name: "Lagos Offshore Base",
      location: "Lagos, Nigeria",
      capacity: 8000,
      description: "West Africa deepwater operations hub",
      status: "ACTIVE",
      coordinate: { lat: 6.45410, lng: 3.39470 },
      createdBy: adminUser.id,
    },
    {
      warehouseId: "WH-012",
      name: "Mumbai Port Facility",
      location: "Mumbai, India",
      capacity: 11000,
      description: "Western India offshore logistics center",
      status: "ACTIVE",
      coordinate: { lat: 19.07600, lng: 72.87770 },
      createdBy: adminUser.id,
    },
    {
      warehouseId: "WH-013",
      name: "Luanda Supply Center",
      location: "Luanda, Angola",
      capacity: 7000,
      description: "Southern Africa deepwater support base",
      status: "MAINTENANCE",
      coordinate: { lat: -8.83900, lng: 13.28940 },
      createdBy: adminUser.id,
    },
    {
      warehouseId: "WH-014",
      name: "Dammam Industrial Yard",
      location: "Dammam, Saudi Arabia",
      capacity: 19000,
      description: "Persian Gulf industrial equipment storage",
      status: "ACTIVE",
      coordinate: { lat: 26.39200, lng: 49.97740 },
      createdBy: adminUser.id,
    },
    {
      warehouseId: "WH-015",
      name: "Kuala Lumpur Depot",
      location: "Port Klang, Malaysia",
      capacity: 9000,
      description: "Malaysia offshore and refinery support",
      status: "ACTIVE",
      coordinate: { lat: 3.00200, lng: 101.39170 },
      createdBy: adminUser.id,
    },
    {
      warehouseId: "WH-016",
      name: "Trinidad Maintenance Yard",
      location: "Point Lisas, Trinidad",
      capacity: 4000,
      description: "Caribbean region maintenance and repair facility",
      status: "MAINTENANCE",
      coordinate: { lat: 10.40520, lng: -61.46830 },
      createdBy: adminUser.id,
    },
    {
      warehouseId: "WH-017",
      name: "Baku Caspian Base",
      location: "Baku, Azerbaijan",
      capacity: 6000,
      description: "Caspian Sea offshore equipment depot",
      status: "ACTIVE",
      coordinate: { lat: 40.40930, lng: 49.86710 },
      createdBy: adminUser.id,
    },
    {
      warehouseId: "WH-018",
      name: "New Orleans Gulf Depot",
      location: "New Orleans, USA",
      capacity: 16000,
      description: "Gulf of Mexico deepwater logistics hub",
      status: "ACTIVE",
      coordinate: { lat: 29.95110, lng: -90.07150 },
      createdBy: adminUser.id,
    },
    {
      warehouseId: "WH-019",
      name: "Macaé Operations Base",
      location: "Macaé, Brazil",
      capacity: 13000,
      description: "Campos Basin offshore operations center",
      status: "ACTIVE",
      coordinate: { lat: -22.37080, lng: -41.78690 },
      createdBy: adminUser.id,
    },
    {
      warehouseId: "WH-020",
      name: "Sakhalin Arctic Depot",
      location: "Yuzhno-Sakhalinsk, Russia",
      capacity: 2000,
      description: "Arctic offshore exploration support facility",
      status: "MAINTENANCE",
      coordinate: { lat: 46.95900, lng: 142.73800 },
      createdBy: adminUser.id,
      oilCapacity: 30000,
      currentOilVolume: 0,
    },
  ];

  for (const warehouse of warehouses) {
    await prisma.warehouse.upsert({
      where: {
        name_location: {
          name: warehouse.name,
          location: warehouse.location,
        },
      },
      update: {},
      create: warehouse,
    });
    console.log(`✅ Tạo warehouse: ${warehouse.name}`);
  }

  console.log("✅ Seed Warehouse thành công!");

  // Seed Sequence cho Equipment
  console.log("🌱 Đang khởi tạo dữ liệu Sequence...");
  await prisma.sequence.upsert({
    where: { name: "equipment" },
    update: {},
    create: {
      name: "equipment",
      value: 0,
    },
  });
  console.log("✅ Seed Sequence thành công!");

  // Seed Equipment
  console.log("🌱 Đang khởi tạo dữ liệu Equipment...");

  const equipmentTypes = [
    "Pump",
    "Valve",
    "Compressor",
    "Sensor",
    "Drilling Rig",
    "Pipeline",
    "Scada Unit",
  ];
  const locations = [
    "Platform A",
    "Platform B",
    "Onshore Facility",
    "Storage Tank",
    "Control Room",
  ];
  const manufacturers = [
    "Baker Hughes",
    "Schlumberger",
    "Halliburton",
    "Weatherford",
    "Cameron",
  ];
  const MESH_EQUIPMENT_MAP = {
    // PUMP
    33: { name: "Pump_OilSuction_01", type: "Pump", label: "Oil Suction Pump" },
    34: { name: "Pump_OilSuction_02", type: "Pump", label: "Oil Suction Pump" },

    // COMPRESSOR
    30: {
      name: "Compressor_AirCooler_01",
      type: "Compressor",
      label: "Air Cooled Heat Exchanger",
    },
    31: {
      name: "Compressor_AirCooler_02",
      type: "Compressor",
      label: "Air Cooled Heat Exchanger",
    },

    // OTHER - Structure
    15: { name: "Other_MainColumn_01", type: "Other", label: "Main Jacket" },
    138: {
      name: "Other_ReinforcementBrace_01",
      type: "Other",
      label: "Reinforcement Brace",
    },
    116: { name: "Other_Walkway_01", type: "Other", label: "Walkway" },

    // OTHER - Drilling
    84: { name: "Other_DrillTower_01", type: "Other", label: "Drill Tower" },
    183: { name: "Other_RotaryTable_01", type: "Other", label: "Rotary Table" },
    175: { name: "Other_DrillString_01", type: "Other", label: "Drill String" },
    85: {
      name: "Other_TravelingBlock_01",
      type: "Other",
      label: "Traveling Block",
    },

    // OTHER - Pipeline
    192: { name: "Other_OilPipeline_01", type: "Other", label: "Oil Pipeline" },
    192001: {
      name: "Other_VerticalRiser_01",
      type: "Other",
      label: "Vertical Riser",
    },
    192003: {
      name: "Other_UtilityBundle_01",
      type: "Other",
      label: "Utility Bundle",
    },

    // OTHER - Tank/Storage
    0: { name: "Other_BulkStorage_01", type: "Other", label: "Bulk Storage" },
    62: {
      name: "Other_OilTankLarge_01",
      type: "Other",
      label: "Large Oil Tank",
    },
    67: {
      name: "Other_OilTankSmall_01",
      type: "Other",
      label: "Small Oil Tank",
    },
    5: { name: "Other_OilDrum_01", type: "Other", label: "Oil Drum 1" },
    5001: { name: "Other_OilDrum_02", type: "Other", label: "Oil Drum 2" },
    63: {
      name: "Other_PressureVessel_01",
      type: "Other",
      label: "Pressure Vessel 1",
    },
    64: {
      name: "Other_PressureVessel_02",
      type: "Other",
      label: "Pressure Vessel 2",
    },
    56: { name: "Other_Barrel_01", type: "Other", label: "Barrel 1" },
    56002: { name: "Other_Barrel_02", type: "Other", label: "Barrel 2" },

    // OTHER - Container
    4: { name: "Other_CargoBox_01", type: "Other", label: "Cargo Box 1" },
    9: { name: "Other_CargoBox_02", type: "Other", label: "Cargo Box 2" },
    16: { name: "Other_Container_01", type: "Other", label: "Container 1" },
    17: { name: "Other_Container_02", type: "Other", label: "Container 2" },
    18: { name: "Other_Container_03", type: "Other", label: "Container 3" },
    19: { name: "Other_Container_04", type: "Other", label: "Container 4" },
    20: { name: "Other_Container_05", type: "Other", label: "Container 5" },
    21: { name: "Other_Container_06", type: "Other", label: "Container 6" },
    22: { name: "Other_Container_07", type: "Other", label: "Container 7" },
    24: { name: "Other_Container_08", type: "Other", label: "Container 8" },
    25: { name: "Other_Container_09", type: "Other", label: "Container 9" },

    // OTHER - Crane
    104: {
      name: "Other_CranePedestal_01",
      type: "Other",
      label: "Crane Pedestal 1",
    },
    112: { name: "Other_CraneBoom_01", type: "Other", label: "Crane Boom 1" },
    105: {
      name: "Other_CranePedestal_02",
      type: "Other",
      label: "Crane Pedestal 2",
    },
    111: { name: "Other_CraneBoom_02", type: "Other", label: "Crane Boom 2" },
    106: {
      name: "Other_CranePedestal_03",
      type: "Other",
      label: "Crane Pedestal 3",
    },
    110: { name: "Other_CraneBoom_03", type: "Other", label: "Crane Boom 3" },
    146: { name: "Other_DeckCrane_01", type: "Other", label: "Deck Crane" },

    // OTHER - Exhaust
    113: {
      name: "Other_GasVentStack_01",
      type: "Other",
      label: "Gas Vent Stack 1",
    },
    114: {
      name: "Other_GasVentStack_02",
      type: "Other",
      label: "Gas Vent Stack 2",
    },
    32: {
      name: "Other_ExhaustSilencer_01",
      type: "Other",
      label: "Exhaust Silencer",
    },

    // OTHER - Building
    88: {
      name: "Other_CentralWarehouse_01",
      type: "Other",
      label: "Central Warehouse",
    },
    90: {
      name: "Other_LivingQuarter_01",
      type: "Other",
      label: "Living Quarter 1",
    },
    91: {
      name: "Other_LivingQuarter_02",
      type: "Other",
      label: "Living Quarter 2",
    },
    98: {
      name: "Other_LivingQuarter_03",
      type: "Other",
      label: "Living Quarter 3",
    },

    // OTHER - Vehicle
    48: { name: "Other_Forklift_01", type: "Other", label: "Forklift 1" },
    50: { name: "Other_Forklift_02", type: "Other", label: "Forklift 2" },

    // OTHER - Vessel
    133: { name: "Other_LifeBoat_01", type: "Other", label: "Life Boat 1" },
    135: { name: "Other_LifeBoat_02", type: "Other", label: "Life Boat 2" },

    // OTHER - Helipad
    124: { name: "Other_Helipad_01", type: "Other", label: "Helipad" },
    117: { name: "Other_Helicopter_01", type: "Other", label: "Helicopter" },

    // OTHER - Rigging
    14: { name: "Other_MooringLine_01", type: "Other", label: "Mooring Line" },

    // OTHER - Material
    195: { name: "Other_SteelCoil_01", type: "Other", label: "Steel Coil" },
    175: { name: "Other_ProductionRiser_01", type: "Other", label: "Production Riser" },
  };
  const equipments = [];
  const meshIds = Object.keys(MESH_EQUIPMENT_MAP).map(Number);

  for (let i = 0; i < meshIds.length; i++) {
    const meshId = meshIds[i];
    const meshData = MESH_EQUIPMENT_MAP[meshId];
    const equipmentId = `EQ-${String(i + 1).padStart(3, "0")}`;
    const location = locations[i % locations.length];
    const manufacturer = manufacturers[i % manufacturers.length];

    equipments.push({
      equipmentId,
      name: meshData.name,
      serialNumber: `SN-${Date.now()}-${meshId}`,
      type: meshData.type,
      model: `Model-${meshData.type}-${meshId}`,
      status: i % 5 === 0 ? "Maintenance" : i % 7 === 0 ? "Inactive" : "Active",
      location,
      manufacturer,
      installDate: new Date(2020 + (i % 5), i % 12, (i % 28) + 1),
      description: meshData.label,
      quantity: 50 + i * 10, // Initial quantity for each equipment
      meshId: meshId, // Add meshId from MESH_EQUIPMENT_MAP
      isDeleted: false,
      specifications: {
        capacity: `${(i + 1) * 100}L`,
        pressure: `${(i + 1) * 10}PSI`,
        temperature: `${(i + 1) * 5}°C`,
        voltage: "220V",
        power: `${(i + 1) * 2}kW`,
      },
    });
  }

  for (const equipment of equipments) {
    await prisma.equipment.upsert({
      where: { equipmentId: equipment.equipmentId },
      update: {},
      create: equipment,
    });
    console.log(
      `✅ Tạo equipment: ${equipment.equipmentId} - ${equipment.name}`,
    );
  }

  // Update sequence value
  await prisma.sequence.update({
    where: { name: "equipment" },
    data: { value: equipments.length },
  });

  console.log("✅ Seed Equipment thành công!");

  // Seed Sequence cho Instrument
  console.log("🌱 Đang khởi tạo dữ liệu Instrument Sequence...");
  await prisma.sequence.upsert({
    where: { name: "instrument" },
    update: {},
    create: {
      name: "instrument",
      value: 0,
    },
  });
  console.log("✅ Seed Instrument Sequence thành công!");

  // Seed Instrument
  console.log("🌱 Đang khởi tạo dữ liệu Instrument...");

  const instrumentTypes = [
    "Offshore Platform",
    "Onshore Rig",
    "FPSO",
    "Jack-up Rig",
    "Semi-submersible",
  ];
  const instrumentLocations = [
    "Gulf of Mexico - Block 42",
    "North Sea - Sector 7",
    "Persian Gulf - Field A",
    "West Africa - Block 15",
    "South China Sea - Platform 3",
    "Bass Strait - Field X",
    "Campos Basin - Block 18",
    "Caspian Sea - Sector 2",
  ];
  const instrumentManufacturers = [
    "Keppel Offshore",
    "Samsung Heavy Industries",
    "Hyundai Heavy Industries",
    "SBM Offshore",
    "MODEC",
  ];
  const instrumentModels = [
    "KFELS B Class",
    "Frigstad D90",
    "GustoMSC CJ70",
    "FPSO Modular",
    "TLP Design",
  ];
  const instrumentStatuses = [
    "Maintenance",
    "Inactive",
    "Active",
  ];

  const instruments = [
    {
      instrumentId: "INS-001",
      name: "Alpha Platform",
      type: "Offshore Platform",
      location: "South China Sea - Block 42",
      manufacturer: "Keppel Offshore",
      model: "KFELS B Class",
      status: "Active",
      installDate: new Date("2020-06-15"),
      description: "Primary offshore drilling platform for deep water operations",
      tankCapacity: 10000,
      currentOilVolume: 0,
      oilType: "Crude Oil - Brent",
      coordinate: { lat: 10.25, lng: 107.95 },
    },
    {
      instrumentId: "INS-002",
      name: "Beta Rig",
      type: "Onshore Rig",
      location: "South China Sea - Sector 7",
      manufacturer: "Samsung Heavy Industries",
      model: "Land Rig 2000",
      status: "Active",
      installDate: new Date("2019-03-22"),
      description: "High-capacity onshore drilling rig",
      tankCapacity: 8000,
      currentOilVolume: 0,
      oilType: "Crude Oil - WTI",
      coordinate: { lat: 11.58767, lng: 116.74072 },
    },
    {
      instrumentId: "INS-003",
      name: "FPSO Gamma",
      type: "FPSO",
      location: "South China Sea - Field A",
      manufacturer: "SBM Offshore",
      model: "FPSO Modular",
      status: "Active",
      installDate: new Date("2018-11-10"),
      description: "Floating Production Storage and Offloading unit",
      tankCapacity: 15000,
      currentOilVolume: 0,
      oilType: "Crude Oil - Brent",
      coordinate: { lat: 9.50, lng: 108.50 },
    },
    {
      instrumentId: "INS-004",
      name: "Delta Jack-up",
      type: "Jack-up Rig",
      location: "South China Sea - Block 15",
      manufacturer: "Keppel Offshore",
      model: "KFELS B Class",
      status: "Maintenance",
      installDate: new Date("2017-08-05"),
      description: "Self-elevating mobile drilling unit",
      tankCapacity: 6000,
      currentOilVolume: 0,
      oilType: "Diesel Fuel",
      coordinate: { lat: 12.10, lng: 109.80 },
    },
    {
      instrumentId: "INS-005",
      name: "Epsilon Semi-sub",
      type: "Semi-submersible",
      location: "South China Sea - Platform 3",
      manufacturer: "Hyundai Heavy Industries",
      model: "Frigstad D90",
      status: "Active",
      installDate: new Date("2021-01-20"),
      description: "Ultra-deepwater semi-submersible drilling rig",
      tankCapacity: 12000,
      currentOilVolume: 0,
      oilType: "Crude Oil - Brent",
      coordinate: { lat: 16.90968, lng: 113.73047 },
    },
    {
      instrumentId: "INS-006",
      name: "Zeta Platform",
      type: "Offshore Platform",
      location: "South China Sea - Field X",
      manufacturer: "MODEC",
      model: "TLP Design",
      status: "Active",
      installDate: new Date("2022-04-12"),
      description: "Tension leg platform for moderate water depths",
      tankCapacity: 10000,
      currentOilVolume: 0,
      oilType: "Crude Oil - WTI",
      coordinate: { lat: 19.84939, lng: 107.95166 },
    },
    {
      instrumentId: "INS-007",
      name: "Eta Rig",
      type: "Onshore Rig",
      location: "South China Sea - Block 18",
      manufacturer: "Samsung Heavy Industries",
      model: "Land Rig 3000",
      status: "Inactive",
      installDate: new Date("2016-09-30"),
      description: "Decommissioned onshore drilling rig",
      tankCapacity: 5000,
      currentOilVolume: 0,
      oilType: "Crude Oil - Brent",
      coordinate: { lat: 5.13471, lng: 110.58838 },
    },
    {
      instrumentId: "INS-008",
      name: "Theta FPSO",
      type: "FPSO",
      location: "South China Sea - Sector 2",
      manufacturer: "SBM Offshore",
      model: "FPSO Advanced",
      status: "Active",
      installDate: new Date("2023-02-28"),
      description: "Latest generation FPSO with enhanced storage capacity",
      tankCapacity: 20000,
      currentOilVolume: 0,
      oilType: "Crude Oil - Brent",
      coordinate: { lat: 9.52491, lng: 101.00830 },
    },
    {
      instrumentId: "INS-009",
      name: "Gulf Deepwater Alpha",
      type: "Semi-submersible",
      location: "Gulf of Mexico - Block 85",
      manufacturer: "Hyundai Heavy Industries",
      model: "Frigstad D90",
      status: "Active",
      installDate: new Date("2015-08-12"),
      description: "Deepwater semi-submersible in the central Gulf of Mexico",
      coordinate: { lat: 27.38000, lng: -90.52000 },
    },
    {
      instrumentId: "INS-010",
      name: "Mars TLP",
      type: "Offshore Platform",
      location: "Gulf of Mexico - Mars Field",
      manufacturer: "MODEC",
      model: "TLP Design",
      status: "Active",
      installDate: new Date("2014-05-20"),
      description: "Tension leg platform at Mars deepwater field",
      coordinate: { lat: 28.16800, lng: -89.22000 },
    },
    {
      instrumentId: "INS-011",
      name: "Perdido Spar",
      type: "Offshore Platform",
      location: "Gulf of Mexico - Perdido Fold Belt",
      manufacturer: "Keppel Offshore",
      model: "KFELS B Class",
      status: "Active",
      installDate: new Date("2010-03-31"),
      description: "Ultra-deepwater spar platform in Perdido region",
      coordinate: { lat: 26.12000, lng: -94.89000 },
    },
    {
      instrumentId: "INS-012",
      name: "Thunder Horse",
      type: "Semi-submersible",
      location: "Gulf of Mexico - Mississippi Canyon",
      manufacturer: "Samsung Heavy Industries",
      model: "Frigstad D90",
      status: "Maintenance",
      installDate: new Date("2008-06-14"),
      description: "Large semi-submersible production facility",
      coordinate: { lat: 28.19500, lng: -88.49500 },
    },
    {
      instrumentId: "INS-013",
      name: "Forties Alpha",
      type: "Offshore Platform",
      location: "North Sea - Forties Field",
      manufacturer: "Keppel Offshore",
      model: "KFELS B Class",
      status: "Active",
      installDate: new Date("2012-07-18"),
      description: "Major fixed platform on the Forties oil field",
      coordinate: { lat: 57.74700, lng: 0.97200 },
    },
    {
      instrumentId: "INS-014",
      name: "Brent Bravo",
      type: "Offshore Platform",
      location: "North Sea - Brent Field",
      manufacturer: "MODEC",
      model: "TLP Design",
      status: "Inactive",
      installDate: new Date("1976-11-10"),
      description: "Historic gravity-based platform on the Brent field",
      coordinate: { lat: 61.06000, lng: 1.71500 },
    },
    {
      instrumentId: "INS-015",
      name: "Troll A Platform",
      type: "Offshore Platform",
      location: "North Sea - Troll Field",
      manufacturer: "Hyundai Heavy Industries",
      model: "GustoMSC CJ70",
      status: "Active",
      installDate: new Date("1995-09-01"),
      description: "Massive concrete gravity platform in Norwegian waters",
      coordinate: { lat: 60.64500, lng: 3.72600 },
    },
    {
      instrumentId: "INS-016",
      name: "Ekofisk Center",
      type: "Offshore Platform",
      location: "North Sea - Ekofisk Field",
      manufacturer: "Keppel Offshore",
      model: "KFELS B Class",
      status: "Active",
      installDate: new Date("2013-04-22"),
      description: "Central processing complex in the Ekofisk area",
      coordinate: { lat: 56.54500, lng: 3.21200 },
    },
    {
      instrumentId: "INS-017",
      name: "Khafji Jack-up",
      type: "Jack-up Rig",
      location: "Persian Gulf - Khafji Field",
      manufacturer: "Keppel Offshore",
      model: "KFELS B Class",
      status: "Active",
      installDate: new Date("2019-01-15"),
      description: "Jack-up rig servicing the Khafji offshore field",
      coordinate: { lat: 28.41800, lng: 48.77300 },
    },
    {
      instrumentId: "INS-018",
      name: "Salman FPSO",
      type: "FPSO",
      location: "Persian Gulf - Salman Field",
      manufacturer: "SBM Offshore",
      model: "FPSO Modular",
      status: "Active",
      installDate: new Date("2017-06-30"),
      description: "FPSO unit at the Salman gas condensate field",
      coordinate: { lat: 26.82000, lng: 52.62000 },
    },
    {
      instrumentId: "INS-019",
      name: "Safaniya Platform",
      type: "Offshore Platform",
      location: "Persian Gulf - Safaniya Field",
      manufacturer: "MODEC",
      model: "TLP Design",
      status: "Maintenance",
      installDate: new Date("2011-10-08"),
      description: "Platform at the world largest offshore oil field",
      coordinate: { lat: 28.13500, lng: 49.32000 },
    },
    {
      instrumentId: "INS-020",
      name: "Bonga FPSO",
      type: "FPSO",
      location: "Gulf of Guinea - Bonga Field",
      manufacturer: "SBM Offshore",
      model: "FPSO Advanced",
      status: "Active",
      installDate: new Date("2005-11-12"),
      description: "Deepwater FPSO off the Niger Delta coastline",
      coordinate: { lat: 4.52000, lng: 4.63000 },
    },
    {
      instrumentId: "INS-021",
      name: "Agbami FPSO",
      type: "FPSO",
      location: "Gulf of Guinea - Agbami Field",
      manufacturer: "MODEC",
      model: "FPSO Modular",
      status: "Active",
      installDate: new Date("2008-07-28"),
      description: "Large capacity FPSO in deepwater Nigeria",
      coordinate: { lat: 4.26000, lng: 4.99000 },
    },
    {
      instrumentId: "INS-022",
      name: "Girassol FPSO",
      type: "FPSO",
      location: "West Africa - Girassol Field",
      manufacturer: "SBM Offshore",
      model: "FPSO Modular",
      status: "Active",
      installDate: new Date("2001-12-04"),
      description: "Deepwater FPSO offshore Angola Block 17",
      coordinate: { lat: -7.05000, lng: 11.98000 },
    },
    {
      instrumentId: "INS-023",
      name: "P-52 Semi-sub",
      type: "Semi-submersible",
      location: "Campos Basin - Roncador Field",
      manufacturer: "Hyundai Heavy Industries",
      model: "Frigstad D90",
      status: "Active",
      installDate: new Date("2007-11-23"),
      description: "Semi-submersible production unit in the Campos Basin",
      coordinate: { lat: -22.46000, lng: -39.85000 },
    },
    {
      instrumentId: "INS-024",
      name: "P-66 FPSO",
      type: "FPSO",
      location: "Santos Basin - Lula Field",
      manufacturer: "MODEC",
      model: "FPSO Advanced",
      status: "Active",
      installDate: new Date("2014-02-10"),
      description: "Pre-salt FPSO at the prolific Lula oil field",
      coordinate: { lat: -25.28000, lng: -42.96000 },
    },
    {
      instrumentId: "INS-025",
      name: "Tupi Jack-up",
      type: "Jack-up Rig",
      location: "Campos Basin - Tupi Block",
      manufacturer: "Keppel Offshore",
      model: "GustoMSC CJ70",
      status: "Maintenance",
      installDate: new Date("2016-05-19"),
      description: "Jack-up exploration rig in the pre-salt Campos Basin",
      coordinate: { lat: -23.38000, lng: -40.72000 },
    },
    {
      instrumentId: "INS-026",
      name: "Azeri Central",
      type: "Offshore Platform",
      location: "Caspian Sea - ACG Field",
      manufacturer: "Samsung Heavy Industries",
      model: "KFELS B Class",
      status: "Active",
      installDate: new Date("2005-02-15"),
      description: "Central platform of the Azeri-Chirag-Gunashli complex",
      coordinate: { lat: 40.15000, lng: 50.95000 },
    },
    {
      instrumentId: "INS-027",
      name: "Kashagan Jack-up",
      type: "Jack-up Rig",
      location: "Caspian Sea - Kashagan Field",
      manufacturer: "Hyundai Heavy Industries",
      model: "GustoMSC CJ70",
      status: "Active",
      installDate: new Date("2013-09-11"),
      description: "Massive offshore development in the north Caspian",
      coordinate: { lat: 46.30000, lng: 51.58000 },
    },
    {
      instrumentId: "INS-028",
      name: "Bass Strait Explorer",
      type: "Semi-submersible",
      location: "Bass Strait - Gippsland Basin",
      manufacturer: "Samsung Heavy Industries",
      model: "Frigstad D90",
      status: "Active",
      installDate: new Date("2018-04-03"),
      description: "Exploration semi-sub in Australia Bass Strait",
      coordinate: { lat: -38.60000, lng: 148.30000 },
    },
    {
      instrumentId: "INS-029",
      name: "Goliat FPSO",
      type: "FPSO",
      location: "Barents Sea - Goliat Field",
      manufacturer: "SBM Offshore",
      model: "FPSO Advanced",
      status: "Maintenance",
      installDate: new Date("2016-03-12"),
      description: "Northernmost FPSO in the Norwegian Barents Sea",
      coordinate: { lat: 71.30000, lng: 22.30000 },
    },
    {
      instrumentId: "INS-030",
      name: "Jubilee FPSO",
      type: "FPSO",
      location: "Gulf of Guinea - Jubilee Field",
      manufacturer: "MODEC",
      model: "FPSO Modular",
      status: "Active",
      installDate: new Date("2010-11-28"),
      description: "Deepwater FPSO offshore Ghana in the Tano Basin",
      coordinate: { lat: 4.58000, lng: -2.79000 },
    },
  ];

  for (const instrument of instruments) {
    await prisma.instrument.upsert({
      where: { instrumentId: instrument.instrumentId },
      update: {},
      create: {
        ...instrument,
        isDeleted: false,
      },
    });
    console.log(
      `✅ Tạo instrument: ${instrument.instrumentId} - ${instrument.name}`,
    );
  }

  // Update instrument sequence value
  await prisma.sequence.update({
    where: { name: "instrument" },
    data: { value: instruments.length },
  });

  console.log("✅ Seed Instrument thành công!");

  // Seed OilTransaction Sequence
  console.log("🌱 Đang khởi tạo dữ liệu OilTransaction Sequence...");
  await prisma.sequence.upsert({
    where: { name: "oilTransaction" },
    update: {},
    create: {
      name: "oilTransaction",
      value: 0,
    },
  });
  console.log("✅ Seed OilTransaction Sequence thành công!");

  // Seed Oil Pump Equipment for each Instrument
  console.log("🌱 Đang khởi tạo dữ liệu Oil Pump cho mỗi Instrument...");
  const allInstrumentsForPump = await prisma.instrument.findMany();
  const oilPumpEquipments = allInstrumentsForPump.map((inst, index) => ({
    equipmentId: `EQ-PUMP-${String(index + 1).padStart(3, "0")}`,
    name: `Oil Pump - ${inst.name}`,
    serialNumber: `OP-SN-${Date.now()}-${index + 1}`,
    type: "Oil Pump",
    model: "HP-500",
    status: inst.status === "Active" ? "Active" : "Inactive",
    location: inst.location,
    manufacturer: "PumpTech Industries",
    installDate: inst.installDate || new Date(),
    description: `Oil extraction pump for ${inst.name}`,
    quantity: 1,
    meshId: null,
    isDeleted: false,
    instrumentId: inst.id,
    specifications: {
      extractionRate: 500,
      unit: "liters",
      oilType: inst.oilType || "Crude Oil - Brent",
      pumpPressure: "3500 PSI",
      maxDepth: "3000m",
    },
  }));

  for (const pump of oilPumpEquipments) {
    await prisma.equipment.upsert({
      where: { equipmentId: pump.equipmentId },
      update: {
        name: pump.name,
        status: pump.status,
        location: pump.location,
        instrumentId: pump.instrumentId,
        specifications: pump.specifications,
      },
      create: pump,
    });
    console.log(`✅ Tạo Oil Pump: ${pump.equipmentId} - ${pump.name}`);
  }
  console.log("✅ Seed Oil Pump thành công!");

  // Seed InstrumentEngineer (assign some engineers to instruments)
  console.log("🌱 Đang khởi tạo dữ liệu InstrumentEngineer...");

  const allInstruments = await prisma.instrument.findMany();
  const engineerUsers = await prisma.user.findMany({
    where: {
      role: {
        name: "Engineer",
      },
    },
    take: 5,
  });

  const engineerAssignments = [];
  for (let i = 0; i < Math.min(allInstruments.length, 5); i++) {
    const instrument = allInstruments[i];
    const engineer = engineerUsers[i % engineerUsers.length];

    if (engineer) {
      engineerAssignments.push({
        instrumentId: instrument.id,
        engineerId: engineer.id,
        engineerName: engineer.fullName,
        engineerEmail: engineer.email,
        role: i % 2 === 0 ? "Primary" : "Support",
      });
    }
  }

  for (const assignment of engineerAssignments) {
    await prisma.instrumentEngineer.upsert({
      where: {
        instrumentId_engineerId: {
          instrumentId: assignment.instrumentId,
          engineerId: assignment.engineerId,
        },
      },
      update: {},
      create: assignment,
    });
  }
  console.log(
    `✅ Tạo ${engineerAssignments.length} instrument-engineer assignments`,
  );

  console.log("✅ Seed InstrumentEngineer thành công!");

  // Seed MaintenanceHistory (unified — equipment + instrument maintenance in 1 table)
  console.log("🌱 Đang khởi tạo dữ liệu MaintenanceHistory...");

  const allEquipments = await prisma.equipment.findMany();
  const maintenanceTypes = [
    "Preventive",
    "Corrective",
    "Calibration",
    "Inspection",
    "Replacement",
  ];
  const maintenanceStatuses = ["Completed", "Pending", "Cancelled"];
  const engineers = [
    "John Smith",
    "Jane Doe",
    "Mike Johnson",
    "Sarah Williams",
    "David Brown",
    "Robert Chen",
    "Emily Martinez",
  ];

  // Assign equipment to instruments (distribute equipment among instruments)
  // Skip Oil Pumps - they already have correct instrumentId from seed
  const nonPumpEquipments = allEquipments.filter((eq) => eq.type !== "Oil Pump");
  const equipmentPerInstrument = Math.ceil(
    nonPumpEquipments.length / allInstruments.length,
  );
  for (let i = 0; i < allInstruments.length; i++) {
    const instrument = allInstruments[i];
    const startIdx = i * equipmentPerInstrument;
    const endIdx = Math.min(
      startIdx + equipmentPerInstrument,
      nonPumpEquipments.length,
    );

    for (let j = startIdx; j < endIdx; j++) {
      await prisma.equipment.update({
        where: { id: nonPumpEquipments[j].id },
        data: {
          instrument: {
            connect: { id: instrument.id },
          },
        },
      });
      // Update local reference
      nonPumpEquipments[j].instrumentId = instrument.id;
    }
  }
  console.log(
    `✅ Assigned ${nonPumpEquipments.length} non-pump equipments to ${allInstruments.length} instruments`,
  );

  // Create maintenance records for each equipment (2-3 per equipment)
  // Each record also links to the equipment's parent instrument
  const maintenanceHistories = [];
  for (let i = 0; i < allEquipments.length; i++) {
    const equipment = allEquipments[i];
    const maintenanceCount = 2 + (i % 2);

    for (let j = 0; j < maintenanceCount; j++) {
      const typeIndex = (i + j) % maintenanceTypes.length;
      const statusIndex = (i + j) % maintenanceStatuses.length;
      maintenanceHistories.push({
        equipmentId: equipment.id,
        instrumentId: equipment.instrumentId || null,
        date: new Date(2024, (i + j) % 12, ((i + j) % 28) + 1),
        type: maintenanceTypes[typeIndex],
        description: `${maintenanceTypes[typeIndex]} maintenance for ${equipment.name}`,
        performedBy: engineers[(i + j) % engineers.length],
        status: maintenanceStatuses[statusIndex],
        cost:
          maintenanceStatuses[statusIndex] === "Completed"
            ? 500 + i * 100 + j * 50
            : null,
      });
    }
  }

  for (const maintenance of maintenanceHistories) {
    await prisma.maintenanceHistory.create({
      data: maintenance,
    });
  }
  console.log(
    `✅ Tạo ${maintenanceHistories.length} maintenance history records`,
  );

  // Seed Inventory
  console.log("🌱 Đang khởi tạo dữ liệu Inventory...");

  const allWarehouses = await prisma.warehouse.findMany();
  const inventories = [];
  let inventoryCounter = 1;

  for (const warehouse of allWarehouses) {
    // Mỗi warehouse có 5-8 equipment khác nhau
    const equipmentCount = 5 + (inventoryCounter % 4);
    const warehouseEquipments = allEquipments.slice(0, equipmentCount);

    for (const equipment of warehouseEquipments) {
      const quantity = 10 + inventoryCounter * 5;
      let stockStatus = "IN_STOCK";
      if (quantity < 20) stockStatus = "LOW";
      if (quantity === 0) stockStatus = "OUT_OF_STOCK";

      inventories.push({
        inventoryId: `INV-${String(inventoryCounter).padStart(3, "0")}`,
        warehouseId: warehouse.id,
        equipmentId: equipment.id,
        quantity,
        stockStatus,
      });
      inventoryCounter++;
    }
  }

  for (const inventory of inventories) {
    await prisma.inventory.create({
      data: inventory,
    });
    console.log(`✅ Tạo inventory: ${inventory.inventoryId}`);
  }

  // Update sequence to match the last inventory counter
  await prisma.sequence.upsert({
    where: { name: "inventory" },
    update: { value: inventoryCounter - 1 },
    create: { name: "inventory", value: inventoryCounter - 1 },
  });

  console.log("✅ Seed Inventory thành công!");

  // Seed InventoryLedger
  console.log("🌱 Đang khởi tạo dữ liệu InventoryLedger...");

  const allInventories = await prisma.inventory.findMany();
  const suppliers = [
    "ABC Equipment Co.",
    "XYZ Supply Inc.",
    "Global Parts Ltd.",
    "Industrial Solutions",
  ];
  const destinations = [
    "Platform A",
    "Platform B",
    "Maintenance Site",
    "Offshore Rig",
  ];
  const receiverNames = [
    "John Receiver",
    "Jane Handler",
    "Mike Dispatcher",
    "Sarah Manager",
  ];

  const ledgers = [];
  for (let i = 0; i < allInventories.length; i++) {
    const inventory = allInventories[i];

    // Mỗi inventory có 2-4 giao dịch (RECEIVE và DISPATCH)
    const transactionCount = 2 + (i % 3);

    for (let j = 0; j < transactionCount; j++) {
      const isReceive = j % 2 === 0;
      const quantity = 5 + j * 2;

      if (isReceive) {
        ledgers.push({
          inventoryId: inventory.id,
          movementType: "RECEIVE",
          quantity,
          supplierName: suppliers[j % suppliers.length],
          receiverId: adminUser.id,
          notes: `Received equipment batch #${i}-${j}`,
          dateReceived: new Date(2024, (i + j) % 12, ((i + j) % 28) + 1),
        });
      } else {
        ledgers.push({
          inventoryId: inventory.id,
          movementType: "DISPATCH",
          quantity,
          destination: destinations[j % destinations.length],
          receiverId: adminUser.id,
          notes: `Dispatched to ${destinations[j % destinations.length]}`,
          dateDispatched: new Date(
            2024,
            (i + j + 1) % 12,
            ((i + j + 1) % 28) + 1,
          ),
        });
      }
    }
  }

  for (const ledger of ledgers) {
    await prisma.inventoryLedger.create({
      data: ledger,
    });
  }
  console.log(`✅ Tạo ${ledgers.length} inventory ledger records`);

  console.log("✅ Seed InventoryLedger thành công!");

  console.log("🎉 ========================================");
  // Seed SystemConfig
  console.log("🌱 Đang khởi tạo dữ liệu SystemConfig...");
  await prisma.systemConfig.upsert({
    where: { key: "INCIDENT_THRESHOLDS" },
    update: {},
    create: {
      key: "INCIDENT_THRESHOLDS",
      value: JSON.stringify({
        pressureLimit: 120,
        tempLimit: 90,
        autoRefreshInterval: 30000,
        alertSoundEnabled: true,
        criticalAlertThreshold: 3,
      }),
      description: "Cấu hình ngưỡng phát hiện sự cố",
    },
  });
  
  await prisma.systemConfig.upsert({
    where: { key: "LOCKOUT_POLICY" },
    update: {},
    create: {
      key: "LOCKOUT_POLICY",
      value: JSON.stringify({
        maxFailedAttempts: 5,
        lockoutDurationMinutes: 15,
      }),
      description: "Cấu hình chính sách khóa IP sau nhiều lần đăng nhập thất bại",
    },
  });

  await prisma.systemConfig.upsert({
    where: { key: "PASSWORD_EXPIRY_POLICY" },
    update: {},
    create: {
      key: "PASSWORD_EXPIRY_POLICY",
      value: JSON.stringify({
        expiryDays: 90,
        notifyDaysBefore: 7,
        enabled: true,
      }),
      description: "Cấu hình chính sách hết hạn mật khẩu",
    },
  });

  console.log("✅ Seed SystemConfig thành công!");

  console.log("🎉 Seed tất cả dữ liệu thành công!");
  console.log("🎉 ========================================");
  console.log("📊 Tổng kết:");
  console.log(`   - Roles: ${roles.length}`);
  console.log(`   - Users: ${users.length}`);
  console.log(`   - Warehouses: ${warehouses.length}`);
  console.log(`   - Equipment: ${equipments.length}`);
  console.log(`   - Instruments: ${instruments.length}`);
  console.log(`   - Instrument Engineers: ${engineerAssignments.length}`);
  console.log(
    `   - Maintenance History: ${maintenanceHistories.length}`,
  );
  console.log(`   - Inventories: ${inventories.length}`);
  console.log(`   - Inventory Ledgers: ${ledgers.length}`);
  console.log("🎉 ========================================");
}

main()
  .catch((e) => {
    console.error("❌ Lỗi khi seed dữ liệu:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
