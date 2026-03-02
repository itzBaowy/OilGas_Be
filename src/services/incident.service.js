import prisma from "../prisma/connect.prisma.js";
import { buildQueryPrisma } from "../common/helpers/build_query_prisma.js";
import { BadRequestException, NotFoundException } from "../common/helpers/exception.helper.js";

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

        return updated;
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
};
