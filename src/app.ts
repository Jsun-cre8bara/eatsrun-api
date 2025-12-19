import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import 'express-async-errors';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import eventRoutes from './routes/event.routes';
import postRoutes from './routes/post.routes';
import couponRoutes from './routes/coupon.routes';
import stampRoutes from './routes/stamp.routes';
import gameRoutes from './routes/game.routes';
import merchantRoutes from './routes/merchant.routes';
import adminRoutes from './routes/admin.routes';

// Import error handler
import { errorHandler } from './middlewares/error.middleware';

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://eatsrun.kr', 'https://admin.eatsrun.kr']
    : '*',
  credentials: true,
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root
app.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'eatsrun api is running',
    env: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'eatsrun-api',
    version: '1.0.0'
  });
});

// API Routes (v1)
app.use('/v1/auth', authRoutes);
app.use('/v1/users', userRoutes);
app.use('/v1/events', eventRoutes);
app.use('/v1/posts', postRoutes);
app.use('/v1/coupons', couponRoutes);
app.use('/v1/stamps', stampRoutes);
app.use('/v1/games', gameRoutes);
app.use('/v1/merchants', merchantRoutes);
app.use('/v1/admin', adminRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
    timestamp: new Date().toISOString(),
  });
});

// Error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════╗
  ║                                       ║
  ║   🏃 잇츠Run API Server Started       ║
  ║                                       ║
  ║   Port: ${PORT}                          ║
  ║   Env:  ${process.env.NODE_ENV || 'development'}                 ║
  ║                                       ║
  ╚═══════════════════════════════════════╝
  `);
});

export default app;
