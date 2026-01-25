import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import type { RackManager } from '../rack/RackManager.js';

const SetChannelValueSchema = z.object({
  value: z.union([z.number(), z.boolean()]),
  override: z.boolean().optional(),
});

export function createIORoutes(rackManager: RackManager): Router {
  const router = Router();

  // Get all I/O states
  router.get('/', (_req: Request, res: Response) => {
    const states = rackManager.getAllModuleStates();
    res.json({
      success: true,
      data: { modules: states },
      timestamp: new Date().toISOString(),
    });
  });

  // Get specific module I/O state
  router.get('/:moduleId', (req: Request, res: Response) => {
    const { moduleId } = req.params;
    const state = rackManager.getModuleState(moduleId);

    if (!state) {
      return res.status(404).json({
        success: false,
        error: 'Module not found',
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      data: state,
      timestamp: new Date().toISOString(),
    });
  });

  // Set channel value
  router.put('/:moduleId/:channel', (req: Request, res: Response) => {
    try {
      const { moduleId, channel } = req.params;
      const channelNum = parseInt(channel, 10);

      if (isNaN(channelNum)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid channel number',
          timestamp: new Date().toISOString(),
        });
      }

      const body = SetChannelValueSchema.parse(req.body);
      const success = rackManager.setChannelValue(moduleId, channelNum, body.value);

      if (!success) {
        return res.status(404).json({
          success: false,
          error: 'Module or channel not found',
          timestamp: new Date().toISOString(),
        });
      }

      // Return updated state
      const state = rackManager.getModuleState(moduleId);
      res.json({
        success: true,
        data: state,
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

  return router;
}
