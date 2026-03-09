import prisma from "../prisma/connect.prisma.js";

export const dashboardService = {
  /**
   * Get dashboard summary stats for Supervisor
   * - Equipment: count by status (Active, Inactive, Maintenance)
   * - Warehouse: count by status (ACTIVE, MAINTENANCE)
   * - Instrument: count by status (Active, Inactive, Maintenance, Decommissioned)
   * - Incident: latest 5 non-RESOLVED incidents
   * - Avg Pressure & Avg Temperature from recent incidents thresholds
   */
  async getSupervisorDashboard() {
    const [
      equipments,
      warehouses,
      instruments,
      recentIncidents,
      totalIncidents,
      resolvedIncidents,
      systemConfig,
    ] = await Promise.all([
      // Equipment grouped by status
      prisma.equipment.findMany({
        where: { isDeleted: false },
        select: { status: true },
      }),
      // Warehouse grouped by status
      prisma.warehouse.findMany({
        select: { status: true },
      }),
      // Instrument grouped by status
      prisma.instrument.findMany({
        where: { isDeleted: false },
        select: { status: true },
      }),
      // Latest 5 non-RESOLVED incidents
      prisma.incident.findMany({
        where: { status: { not: "RESOLVED" } },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          incidentId: true,
          instrumentId: true,
          instrumentName: true,
          type: true,
          severity: true,
          status: true,
          description: true,
          createdAt: true,
        },
      }),
      // Total incidents count
      prisma.incident.count(),
      // Resolved incidents count
      prisma.incident.count({ where: { status: "RESOLVED" } }),
      // System config for thresholds
      prisma.systemConfig.findUnique({ where: { key: "INCIDENT_THRESHOLDS" } }),
    ]);

    // --- Equipment status breakdown ---
    const equipmentStatus = { Active: 0, Inactive: 0, Maintenance: 0 };
    equipments.forEach((e) => {
      if (equipmentStatus[e.status] !== undefined) equipmentStatus[e.status]++;
    });

    // --- Warehouse status breakdown ---
    const warehouseStatus = { ACTIVE: 0, MAINTENANCE: 0 };
    warehouses.forEach((w) => {
      if (warehouseStatus[w.status] !== undefined) warehouseStatus[w.status]++;
    });

    // --- Instrument status breakdown ---
    const instrumentStatus = { Active: 0, Inactive: 0, Maintenance: 0, Decommissioned: 0 };
    instruments.forEach((i) => {
      if (instrumentStatus[i.status] !== undefined) instrumentStatus[i.status]++;
    });

    // --- Parse thresholds ---
    let thresholds = { pressureLimit: 120, tempLimit: 90 };
    if (systemConfig?.value) {
      try {
        thresholds = JSON.parse(systemConfig.value);
      } catch {
        // keep defaults
      }
    }

    // --- Compute avg pressure & temperature from recent incidents ---
    const pressureIncidents = await prisma.incident.findMany({
      where: { type: "PRESSURE_ANOMALY", currentReading: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { currentReading: true },
    });
    const tempIncidents = await prisma.incident.findMany({
      where: { type: "TEMPERATURE_ANOMALY", currentReading: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { currentReading: true },
    });

    const avgPressure = pressureIncidents.length
      ? pressureIncidents.reduce((sum, i) => sum + (i.currentReading || 0), 0) / pressureIncidents.length
      : null;
    const avgTemperature = tempIncidents.length
      ? tempIncidents.reduce((sum, i) => sum + (i.currentReading || 0), 0) / tempIncidents.length
      : null;

    return {
      // Summary cards
      avgPressure: avgPressure !== null ? Math.round(avgPressure * 10) / 10 : null,
      avgTemperature: avgTemperature !== null ? Math.round(avgTemperature * 10) / 10 : null,
      pressureThreshold: thresholds.pressureLimit,
      temperatureThreshold: thresholds.tempLimit,

      activeEquipment: equipmentStatus.Active,
      totalEquipment: equipments.length,

      activeWarehouse: warehouseStatus.ACTIVE,
      totalWarehouse: warehouses.length,

      activeInstrument: instrumentStatus.Active,
      totalInstrument: instruments.length,

      // Status breakdown for charts
      equipmentStatusBreakdown: [
        { name: "Active", value: equipmentStatus.Active, color: "#22c55e" },
        { name: "Inactive", value: equipmentStatus.Inactive, color: "#ef4444" },
        { name: "Maintenance", value: equipmentStatus.Maintenance, color: "#eab308" },
      ],
      warehouseStatusBreakdown: [
        { name: "Active", value: warehouseStatus.ACTIVE, color: "#22c55e" },
        { name: "Maintenance", value: warehouseStatus.MAINTENANCE, color: "#eab308" },
      ],
      instrumentStatusBreakdown: [
        { name: "Active", value: instrumentStatus.Active, color: "#22c55e" },
        { name: "Inactive", value: instrumentStatus.Inactive, color: "#ef4444" },
        { name: "Maintenance", value: instrumentStatus.Maintenance, color: "#eab308" },
        { name: "Decommissioned", value: instrumentStatus.Decommissioned, color: "#6b7280" },
      ],

      // Incident management
      recentIncidents,
      totalIncidents,
      resolvedIncidents,
      openIncidents: totalIncidents - resolvedIncidents,
    };
  },
};
