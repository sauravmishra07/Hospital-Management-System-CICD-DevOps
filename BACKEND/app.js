import express from 'express';
import { config } from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import fileUpload from 'express-fileupload';
import { connectDB } from './database/dbconnection.js';
import messageRouter from './router/messageRouter.js';
import { errorMiddleware } from './middlewares/errorMiddleware.js';
import userRouter from "./router/userRouter.js";
import appointmentRouter from "./router/appointmentRouter.js";
import logger from './utils/logger.js';

const app = express(); 
config({ path: './config/config.env'});

app.use(
    cors({
        origin: [process.env.FRONTEND_URL, process.env.DASHBOARD_URL],
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true,
    })
)
 
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(fileUpload({
    useTempFiles: true,
    tempFileDir: '/tmp/',
    createParentPath: true,
}));

// Add this middleware early in your app
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`);
    next();
});

app.get('/api/v1/check', (req, res) => {
    res.status(200).json({ message: 'Backend is running successfully!' });
});

app.use('/api/v1/message', messageRouter);
app.use("/api/v1/user", userRouter);
app.use("/api/v1/appointment", appointmentRouter);
connectDB();
app.use(errorMiddleware);
export default app;