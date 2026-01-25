import { Router, type Request, type Response } from 'express';
import os from 'os';

const startTime = Date.now();

export function createSystemRoutes(): Router {
  const router = Router();

  // Get system info
  router.get('/info', (_req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        version: '1.0.0',
        uptime: Date.now() - startTime,
        platform: os.platform(),
        nodeVersion: process.version,
        memory: {
          total: os.totalmem(),
          free: os.freemem(),
          used: process.memoryUsage(),
        },
      },
      timestamp: new Date().toISOString(),
    });
  });

  // Health check (lightweight)
  router.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      uptime: Date.now() - startTime,
    });
  });

  return router;
}
