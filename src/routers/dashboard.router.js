import express from "express";
import { dashboardController } from "../controllers/dashboard.controller.js";
import { protect } from "../common/middlewares/protect.middleware.js";
import { checkPermission } from "../common/middlewares/authorization.middleware.js";

const dashboardRouter = express.Router();

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Dashboard API for Supervisor
 */

/**
 * @swagger
 * /api/dashboard/supervisor:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get Supervisor Dashboard Data
 *     description: Returns real-time summary stats for Equipment, Warehouse, Instrument, and Incidents.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 */
dashboardRouter.get(
  "/supervisor",
  protect,
  checkPermission(["VIEW_DASHBOARD", "ALL"]),
  dashboardController.getSupervisorDashboard
);

export default dashboardRouter;
