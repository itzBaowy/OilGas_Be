import express from 'express';
import authRouter from './auth.router.js';
import userRouter from './user.router.js';
import logRouter from './log.router.js';
import auditLogRouter from './auditLog.router.js';
import roleRouter from './role.router.js';
import warehouseRouter from './warehouse.router.js';
import equipmentRouter from './equipment.router.js';
import instrumentRouter from './instrument.router.js';
import { inventoryRouter } from './inventory.router.js';
import { oilTransactionRouter } from './oilTransaction.router.js';
import notificationRouter from './notification.router.js';
import systemConfigRouter from './systemConfig.router.js';
import incidentRouter from './incident.router.js';

const rootRouter = express.Router()

rootRouter.use("/auth", authRouter)
rootRouter.use("/users", userRouter)
rootRouter.use("/logs", logRouter)
rootRouter.use("/audit-logs", auditLogRouter)
rootRouter.use("/roles", roleRouter)
rootRouter.use("/warehouses", warehouseRouter)
rootRouter.use("/equipments", equipmentRouter)
rootRouter.use("/instruments", instrumentRouter)
rootRouter.use("/inventory", inventoryRouter)
rootRouter.use("/oil-transactions", oilTransactionRouter)
rootRouter.use("/notifications", notificationRouter)
rootRouter.use("/system-config", systemConfigRouter)
rootRouter.use("/incidents", incidentRouter)


export default rootRouter