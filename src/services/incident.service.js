import prisma from "../prisma/connect.prisma.js";
import { buildQueryPrisma } from "../common/helpers/build_query_prisma.js";
import { BadRequestException, NotFoundException } from "../common/helpers/exception.helper.js";
import { notificationService } from "./notification.service.js";
import { getIO } from "../common/socket/init.socket.js";

// ── Constants ────────────────────────────────────────────────────────────────
const VALID_TYPES = [
    "PRESSURE_ANOMALY",
    "TEMPERATURE_ANOMALY",
    "LEAKAGE",
    "EQUIPMENT_FAILURE",
    "SENSOR_MALFUNCTION",
];

const VALID_SEVERITIES = ["WARNING", "CRITICAL", "FATAL"];

const VALID_STATUSES = ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS", "RESOLVED"];

// Severity order for sorting active alerts (higher = more severe)
const SEVERITY_ORDER = { FATAL: 3, CRITICAL: 2, WARNING: 1 };

const parseNumericValue = (val) => {
  if (val == null) return null;
  if (typeof val === 'number') return val;
  const num = parseFloat(String(val).replace(/[^0-9.\-]/g, ''));
  return isNaN(num) ? null : num;
};

const CONFIG_KEY = 'INCIDENT_THRESHOLDS';

const DEFAULT_THRESHOLDS = {
  pressureLimit: 120,
  tempLimit: 90,
};

export const incidentService = {
    // ── ID Generator ─────────────────────────────────────────────────────────
    async generateIncidentId() {
        const updated = await prisma.sequence.upsert({
            where: { name: "incident" },
            update: { value: { increment: 1 } },
            create: { name: "incident", value: 1 },
        });
        return `INC-${String(updated.value).padStart(3, "0")}`;
    },

    // ── 1. Get All Incidents (with filters + pagination) ─────────────────────
    async getAllIncidents(req) {
        const { page, pageSize, where, index } = buildQueryPrisma(req.query);

        // buildQueryPrisma wraps strings with { contains }, but status/severity/type
        // need exact match — override them here.
        if (where.status)   where.status   = typeof where.status   === 'object' ? where.status.contains   : where.status;
        if (where.severity) where.severity = typeof where.severity === 'object' ? where.severity.contains : where.severity;
        if (where.type)     where.type     = typeof where.type     === 'object' ? where.type.contains     : where.type;

        // Date range filter (passed as separate query params, not inside filters JSON)
        if (req.query.startDate || req.query.endDate) {
            where.createdAt = {};
            if (req.query.startDate) where.createdAt.gte = new Date(req.query.startDate);
            if (req.query.endDate)   where.createdAt.lte = new Date(req.query.endDate);
        }

        const [items, totalItems] = await Promise.all([
            prisma.incident.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip: index,
                take: pageSize,
            }),
            prisma.incident.count({ where }),
        ]);

        return {
            items,
            pagination: {
                page,
                pageSize,
                totalItems,
                totalPages: Math.ceil(totalItems / pageSize),
            },
        };
    },

    // ── 2. Get Incident By ID ─────────────────────────────────────────────────
    async getIncidentById(id) {
        const incident = await prisma.incident.findUnique({ where: { id } });
        if (!incident) throw new NotFoundException("Incident not found");
        return incident;
    },

    // ── 3. Create Incident ────────────────────────────────────────────────────
    async createIncident(data, user) {
        const {
            instrumentId,
            instrumentName,
            type,
            severity,
            description,
            currentReading,
            threshold,
        } = data;

        // --- Validation ---
        if (!instrumentId)   throw new BadRequestException("instrumentId is required");
        if (!instrumentName) throw new BadRequestException("instrumentName is required");
        if (!type)           throw new BadRequestException("type is required");
        if (!severity)       throw new BadRequestException("severity is required");
        if (!description)    throw new BadRequestException("description is required");

        if (!VALID_TYPES.includes(type)) {
            throw new BadRequestException(
                `Invalid type. Must be one of: ${VALID_TYPES.join(", ")}`
            );
        }
        if (!VALID_SEVERITIES.includes(severity)) {
            throw new BadRequestException(
                `Invalid severity. Must be one of: ${VALID_SEVERITIES.join(", ")}`
            );
        }
        if (description.trim().length < 5) {
            throw new BadRequestException("description must be at least 5 characters");
        }

        const incidentId    = await this.generateIncidentId();
        const createdByName = user?.fullName || "System Auto-Detection";
        const createdById   = user?.id       || null;

        const incident = await prisma.incident.create({
            data: {
                incidentId,
                instrumentId,
                instrumentName,
                type,
                severity,
                status: "OPEN",
                description,
                currentReading: currentReading ?? null,
                threshold:      threshold      ?? null,
                createdById,
                createdByName,
            },
        });

        return incident;
    },

    // ── 4. Acknowledge Incident (Engineer) ────────────────────────────────────
    async acknowledgeIncident(id, user) {
        const incident = await prisma.incident.findUnique({ where: { id } });
        if (!incident) throw new NotFoundException("Incident not found");

        if (incident.status !== "OPEN") {
            throw new BadRequestException("Only OPEN incidents can be acknowledged");
        }

        const updated = await prisma.incident.update({
            where: { id },
            data: {
                status:              "ACKNOWLEDGED",
                acknowledgedAt:      new Date(),
                acknowledgedById:    user.id,
                acknowledgedByName:  user.fullName,
            },
        });

        return updated;
    },

    // ── 4b. Get Available Engineers (prioritized for assignment) ──────────────
    async getAvailableEngineers(incidentId) {
        const incident = await prisma.incident.findUnique({ where: { id: incidentId } });
        if (!incident) throw new NotFoundException("Incident not found");

        // Lấy Instrument (ObjectId) từ instrumentId string (INS-xxx)
        const instrument = await prisma.instrument.findFirst({
            where: {
                OR: [
                    { instrumentId: incident.instrumentId },
                    { id: /^[a-fA-F0-9]{24}$/.test(incident.instrumentId) ? incident.instrumentId : undefined },
                ].filter(Boolean),
                isDeleted: false,
            },
            select: { id: true, instrumentId: true, name: true },
        });

        // Lấy danh sách Engineer đang assign cho Instrument này
        const assignedEngineerIds = new Set();
        if (instrument) {
            const assignments = await prisma.instrumentEngineer.findMany({
                where: { instrumentId: instrument.id },
                select: { engineerId: true },
            });
            assignments.forEach((a) => assignedEngineerIds.add(a.engineerId));
        }

        // Lấy danh sách Engineer đang handle incident active (OPEN/ACKNOWLEDGED/IN_PROGRESS)
        const busyIncidents = await prisma.incident.findMany({
            where: {
                status: { in: ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS"] },
                acknowledgedById: { not: null },
            },
            select: { acknowledgedById: true },
        });
        const busyEngineerIds = new Set(busyIncidents.map((i) => i.acknowledgedById));

        // Lấy tất cả Engineer active
        const engineers = await prisma.user.findMany({
            where: {
                role: { name: "Engineer" },
                isActive: true,
                status: "ACTIVE",
            },
            select: {
                id: true,
                fullName: true,
                email: true,
            },
        });

        // Phân loại và sắp xếp ưu tiên
        const prioritized = engineers.map((eng) => {
            const isAssignedToRig = assignedEngineerIds.has(eng.id);
            const isBusy = busyEngineerIds.has(eng.id);
            // Priority: 1 = assigned to rig + free, 2 = free, 3 = assigned to rig + busy, 4 = busy
            let priority = 4;
            if (isAssignedToRig && !isBusy) priority = 1;
            else if (!isAssignedToRig && !isBusy) priority = 2;
            else if (isAssignedToRig && isBusy) priority = 3;

            return {
                id: eng.id,
                fullName: eng.fullName,
                email: eng.email,
                isAssignedToRig,
                isBusy,
                priority,
            };
        });

        prioritized.sort((a, b) => a.priority - b.priority);

        return {
            incidentId: incident.id,
            instrumentId: incident.instrumentId,
            instrumentName: incident.instrumentName,
            engineers: prioritized,
        };
    },

    // ── 4c. Assign Engineer to Incident (Supervisor) ─────────────────────────
    async assignEngineerToIncident(incidentId, data, user) {
        const { engineerId } = data;
        if (!engineerId) throw new BadRequestException("engineerId is required");

        const incident = await prisma.incident.findUnique({ where: { id: incidentId } });
        if (!incident) throw new NotFoundException("Incident not found");

        if (incident.status === "RESOLVED") {
            throw new BadRequestException("Cannot assign engineer to a resolved incident");
        }
        if (incident.acknowledgedById) {
            throw new BadRequestException("This incident already has an assigned engineer");
        }

        // Validate engineer
        const engineer = await prisma.user.findUnique({
            where: { id: engineerId },
            include: { role: true },
        });
        if (!engineer) throw new NotFoundException("Engineer not found");
        if (engineer.role.name !== "Engineer") {
            throw new BadRequestException("Selected user is not an Engineer");
        }

        const updated = await prisma.incident.update({
            where: { id: incidentId },
            data: {
                status:             "ACKNOWLEDGED",
                acknowledgedAt:     new Date(),
                acknowledgedById:   engineer.id,
                acknowledgedByName: engineer.fullName,
            },
        });

        // Notification cho Engineer được chỉ định
        await notificationService.createBulkNotifications({
            recipientIds: [engineer.id],
            title: "Incident Assigned to You",
            message: `Supervisor ${user.fullName} has assigned you to handle incident ${incident.incidentId || incident.id} on ${incident.instrumentName} (${incident.instrumentId}). Severity: ${incident.severity}.`,
            type: incident.severity === "FATAL" ? "ERROR" : incident.severity === "CRITICAL" ? "WARNING" : "INFO",
            category: "INCIDENT",
            relatedId: incident.id,
            link: "/realtime-alerts",
            createdBy: user.id,
        });

        // Socket event cho real-time sync
        const io = getIO();
        if (io) {
            io.emit("engineer_assigned_to_incident", {
                incidentId: incident.id,
                engineerId: engineer.id,
                engineerName: engineer.fullName,
                assignedBy: user.fullName,
                timestamp: new Date().toISOString(),
            });
        }

        return updated;
    },

    // ── 5. Respond to Incident (Supervisor) ───────────────────────────────────
    async respondToIncident(id, data, user) {
        const { actionTaken, status } = data;

        // --- Validation ---
        if (!actionTaken || actionTaken.trim().length < 10) {
            throw new BadRequestException(
                "Action taken is required (minimum 10 characters)"
            );
        }
        if (!status || !["IN_PROGRESS", "RESOLVED"].includes(status)) {
            throw new BadRequestException(
                "status must be IN_PROGRESS or RESOLVED"
            );
        }

        const incident = await prisma.incident.findUnique({ where: { id } });
        if (!incident) throw new NotFoundException("Incident not found");

        if (incident.status === "RESOLVED") {
            throw new BadRequestException("Cannot respond to a resolved incident");
        }

        const updateData = { actionTaken, status };

        if (status === "RESOLVED") {
            updateData.resolvedAt      = new Date();
            updateData.resolvedById    = user.id;
            updateData.resolvedByName  = user.fullName;
        }

        const updated = await prisma.incident.update({
            where: { id },
            data: updateData,
        });

        // ── Recovery: Khi RESOLVED → kiểm tra Instrument có cần về Active không ──
        if (status === "RESOLVED" && incident.instrumentId) {
            this._recoverInstrumentStatus(incident.instrumentId)
                .catch((err) => console.error('[IncidentResolve] Instrument recovery failed:', err));
        }

        /* [THRESHOLD_SCAN_DISABLED] ─────────────────────────────────────────
         * Tạm tắt: Re-scan thiết bị sau khi resolve incident.
         * Khi bật lại: bỏ comment block bên dưới.
         * ────────────────────────────────────────────────────────────────────── */
        // if (status === "RESOLVED" && incident.instrumentId) {
        //     this._rescanAfterResolve(incident, user)
        //         .catch((err) => console.error('[IncidentRescan] Post-resolve scan failed:', err));
        // }

        return updated;
    },

    /**
     * Recovery Instrument status sau khi resolve incident.
     * Nếu Instrument đang Maintenance và không còn incident active nào → chuyển về Active.
     * Logic này TÁCH BIỆT với threshold scan — là chức năng cốt lõi của Incident lifecycle.
     */
    async _recoverInstrumentStatus(instrumentIdStr) {
        const instrument = await prisma.instrument.findFirst({
            where: {
                OR: [
                    { instrumentId: instrumentIdStr },
                    { id: /^[a-fA-F0-9]{24}$/.test(instrumentIdStr) ? instrumentIdStr : undefined },
                ].filter(Boolean),
                isDeleted: false,
            },
            select: { id: true, instrumentId: true, status: true },
        });

        if (!instrument || instrument.status !== 'Maintenance') return;

        const remainingActive = await prisma.incident.count({
            where: {
                instrumentId: instrument.instrumentId,
                status: { in: ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS'] },
            },
        });

        if (remainingActive === 0) {
            await prisma.instrument.update({
                where: { id: instrument.id },
                data: { status: 'Active' },
            });
        }
    },

    /**
     * Startup check: Quét tất cả Instrument đang Maintenance mà không còn
     * incident active nào → chuyển về Active.
     * Gọi 1 lần duy nhất khi server khởi động.
     */
    async reconcileInstrumentStatuses() {
        const maintenanceInstruments = await prisma.instrument.findMany({
            where: { status: 'Maintenance', isDeleted: false },
            select: { id: true, instrumentId: true, name: true },
        });

        if (maintenanceInstruments.length === 0) return;

        let recoveredCount = 0;

        for (const ins of maintenanceInstruments) {
            const activeIncidentCount = await prisma.incident.count({
                where: {
                    instrumentId: ins.instrumentId,
                    status: { in: ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS'] },
                },
            });

            if (activeIncidentCount === 0) {
                await prisma.instrument.update({
                    where: { id: ins.id },
                    data: { status: 'Active' },
                });
                recoveredCount++;
                console.log(`[StartupCheck] ${ins.instrumentId} (${ins.name}): Maintenance → Active (no active incidents)`);
            }
        }

        if (recoveredCount > 0) {
            console.log(`[StartupCheck] Recovered ${recoveredCount}/${maintenanceInstruments.length} instruments from Maintenance → Active`);
        }
    },

    /**
     * BACKGROUND: Re-scan thiết bị sau khi resolve incident.
     * Nếu Equipment readings vẫn vượt ngưỡng → tạo incident mới (thiết bị chưa thực sự sửa xong).
     * Nếu readings đã an toàn → chuyển Instrument về Active (nếu không còn incident active nào khác).
     */
    async _rescanAfterResolve(resolvedIncident, user) {
        const { instrumentId } = resolvedIncident;

        // Lấy threshold hiện tại
        const configRow = await prisma.systemConfig.findUnique({ where: { key: CONFIG_KEY } });
        const thresholds = configRow ? JSON.parse(configRow.value) : DEFAULT_THRESHOLDS;
        const { pressureLimit, tempLimit } = thresholds;

        // Lấy Instrument
        const instrument = await prisma.instrument.findFirst({
            where: { instrumentId, isDeleted: false },
            select: { id: true, instrumentId: true, name: true, status: true },
        });
        if (!instrument) return;

        // Lấy tất cả Equipment thuộc Instrument này
        const equipments = await prisma.equipment.findMany({
            where: {
                instrumentId: instrument.id,
                isDeleted: false,
                status: { not: 'Inactive' },
            },
            select: { equipmentId: true, name: true, specifications: true },
        });

        // Kiểm tra readings vượt ngưỡng
        const violations = [];
        for (const eq of equipments) {
            if (!eq.specifications) continue;
            const specs = typeof eq.specifications === 'string'
                ? JSON.parse(eq.specifications) : eq.specifications;

            const pressure    = parseNumericValue(specs.pressure);
            const temperature = parseNumericValue(specs.temperature);

            if (pressure !== null && pressure > pressureLimit) {
                violations.push({ type: 'PRESSURE_ANOMALY', reading: pressure, limit: pressureLimit, eq });
            }
            if (temperature !== null && temperature > tempLimit) {
                violations.push({ type: 'TEMPERATURE_ANOMALY', reading: temperature, limit: tempLimit, eq });
            }
        }

        // Kiểm tra incident active còn lại (ngoài incident vừa resolve)
        const remainingActive = await prisma.incident.findMany({
            where: {
                instrumentId,
                status: { in: ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS'] },
            },
            select: { type: true },
        });
        const activeTypes = new Set(remainingActive.map((i) => i.type));

        // Tạo incident mới cho từng vi phạm chưa có incident active cùng type
        for (const v of violations) {
            if (activeTypes.has(v.type)) continue;
            activeTypes.add(v.type);

            const ratio = v.reading / v.limit;
            const severity = ratio >= 1.5 ? 'FATAL' : ratio >= 1.2 ? 'CRITICAL' : 'WARNING';

            try {
                await this.createIncident(
                    {
                        instrumentId,
                        instrumentName: instrument.name,
                        type: v.type,
                        severity,
                        description: `Auto-detected after resolve: ${v.eq.name} (${v.eq.equipmentId}) reading ${v.reading} still exceeds threshold ${v.limit}.`,
                        currentReading: v.reading,
                        threshold: v.limit,
                    },
                    { id: user.id, fullName: 'System Re-scan' }
                );
            } catch (err) {
                console.error(`[IncidentRescan] Failed to create incident for ${instrumentId}:`, err.message);
            }
        }

        // Nếu không còn vi phạm VÀ không còn incident active → chuyển về Active
        if (violations.length === 0 && remainingActive.length === 0) {
            if (instrument.status === 'Maintenance') {
                await prisma.instrument.update({
                    where: { id: instrument.id },
                    data: { status: 'Active' },
                });
            }
        }
    },

    // ── 6. Active Alerts ──────────────────────────────────────────────────────
    async getActiveAlerts() {
        const items = await prisma.incident.findMany({
            where: { status: { in: ["OPEN", "ACKNOWLEDGED"] } },
            orderBy: { createdAt: "desc" },
        });

        // Sort by severity desc, then createdAt desc
        items.sort((a, b) => {
            const severityDiff =
                (SEVERITY_ORDER[b.severity] || 0) - (SEVERITY_ORDER[a.severity] || 0);
            if (severityDiff !== 0) return severityDiff;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        const hasHighSeverity = items.some(
            (i) => i.severity === "CRITICAL" || i.severity === "FATAL"
        );

        return {
            items,
            count: items.length,
            hasHighSeverity,
        };
    },

    // ── 7. Manual Fault Report (Supervisor only) ──────────────────────────────
    async reportManualIncident(data, user) {
        const {
            instrumentId,
            instrumentName,
            type,
            severity,
            description,
        } = data;

        if (!instrumentId)   throw new BadRequestException("instrumentId is required");
        if (!instrumentName) throw new BadRequestException("instrumentName is required");
        if (!type)           throw new BadRequestException("type is required");
        if (!severity)       throw new BadRequestException("severity is required");
        if (!description)    throw new BadRequestException("description is required");

        if (!VALID_TYPES.includes(type)) {
            throw new BadRequestException(
                `Invalid type. Must be one of: ${VALID_TYPES.join(", ")}`
            );
        }
        if (!VALID_SEVERITIES.includes(severity)) {
            throw new BadRequestException(
                `Invalid severity. Must be one of: ${VALID_SEVERITIES.join(", ")}`
            );
        }
        if (description.trim().length < 10) {
            throw new BadRequestException("Description must be at least 10 characters for manual reports");
        }

        // Kiểm tra instrument tồn tại
        const instrument = await prisma.instrument.findFirst({
            where: {
              OR: [
                { instrumentId },
                { id: /^[a-fA-F0-9]{24}$/.test(instrumentId) ? instrumentId : undefined },
              ].filter(Boolean),
              isDeleted: false,
            },
        });

        if (!instrument) {
            throw new NotFoundException("Instrument not found");
        }

        const incidentId    = await this.generateIncidentId();
        const createdByName = user?.fullName || "Unknown";
        const createdById   = user?.id       || null;

        const incident = await prisma.incident.create({
            data: {
                incidentId,
                instrumentId: instrument.instrumentId,
                instrumentName: instrument.name,
                type,
                severity,
                status: "OPEN",
                description: `[Manual Report] ${description}`,
                currentReading: null,
                threshold:      null,
                createdById,
                createdByName,
            },
        });

        // Chuyển Instrument sang Maintenance nếu chưa phải
        if (instrument.status !== 'Maintenance' && instrument.status !== 'Decommissioned') {
            await prisma.instrument.update({
                where: { id: instrument.id },
                data: { status: 'Maintenance' },
            });
        }

        // ── Notification cho Supervisor & Engineer ────────────────────────────
        const recipients = await prisma.user.findMany({
            where: {
                role: { name: { in: ['Supervisor', 'Engineer', 'Admin'] } },
                isActive: true,
            },
            select: { id: true },
        });

        const recipientIds = recipients.map((u) => u.id);

        if (recipientIds.length > 0) {
            await notificationService.createBulkNotifications({
                recipientIds,
                title: 'Manual Fault Report',
                message: `${createdByName} reported a fault on ${instrument.name} (${instrument.instrumentId}). Severity: ${severity}. Incident ${incidentId} created — pending review.`,
                type: severity === 'FATAL' ? 'ERROR' : severity === 'CRITICAL' ? 'WARNING' : 'INFO',
                category: 'INCIDENT',
                relatedId: incident.id,
                link: '/action-approval',
                createdBy: createdById,
            });
        }

        // ── Socket event cho real-time sync ───────────────────────────────────
        const io = getIO();
        if (io) {
            io.emit('manual_fault_reported', {
                incident: {
                    id: incident.id,
                    incidentId,
                    instrumentId: instrument.instrumentId,
                    instrumentName: instrument.name,
                    type,
                    severity,
                    status: 'OPEN',
                },
                reportedBy: createdByName,
                timestamp: new Date().toISOString(),
            });
        }

        return incident;
    },
};
