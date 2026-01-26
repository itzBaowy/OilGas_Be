import express from 'express';
import authRouter from './auth.router.js';
import userRouter from './user.router.js';
import logRouter from './log.router.js';

const rootRouter = express.Router()

rootRouter.use("/auth", authRouter)
rootRouter.use("/user", userRouter)
rootRouter.use("/logs", logRouter)

export default rootRouter