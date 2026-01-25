import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import type { RackManager } from '../rack/RackManager.js';

const CreateRackSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

export function createRackRoutes(rackManager: RackManager): Router {
  const router = Router();

  // Get current rack configuration
  router.get('/', (_req: Request, res: Response) => {
    const config = rackManager.getConfig();
    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'No rack loaded',
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      data: {
        config,
        state: {
          simulationState: rackManager.getSimulationState(),
          modules: rackManager.getAllModuleStates(),
        },
      },
      timestamp: new Date().toISOString(),
    });
  });

  // Create new rack
  router.post('/', (req: Request, res: Response) => {
    try {
      const body = CreateRackSchema.parse(req.body);
      const config = rackManager.createRack(body.name, body.description);

      res.status(201).json({
        success: true,
        data: config,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors,
          timestamp: new Date().toISOString(),
        });
      }
      throw error;
    }
  });

  // Clear rack
  router.delete('/', (_req: Request, res: Response) => {
    rackManager.clearRack();
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}
