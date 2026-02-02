import express from 'express';
import authRouter from './auth.router.js';
import userRouter from './user.router.js';
import logRouter from './log.router.js';
import roleRouter from './role.router.js';
import warehouseRouter from './warehouse.router.js';

const rootRouter = express.Router()

rootRouter.use("/auth", authRouter)
rootRouter.use("/users", userRouter)
rootRouter.use("/logs", logRouter)
rootRouter.use("/roles", roleRouter)
rootRouter.use("/warehouses", warehouseRouter)

export default rootRouter