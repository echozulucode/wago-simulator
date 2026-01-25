import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import type { RackManager } from '../rack/RackManager.js';
import { MODULE_CATALOG, getMVPModules } from '@wago/shared';

const AddModuleSchema = z.object({
  moduleNumber: z.string(),
  slotPosition: z.number().int().min(0),
  label: z.string().max(50).optional(),
});

export function createModuleRoutes(rackManager: RackManager): Router {
  const router = Router();

  // Get available module types (catalog)
  router.get('/catalog', (_req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        modules: getMVPModules(),
        all: Object.values(MODULE_CATALOG),
      },
      timestamp: new Date().toISOString(),
    });
  });

  // Get modules in current rack
  router.get('/', (_req: Request, res: Response) => {
    const modules = rackManager.getModules();
    res.json({
      success: true,
      data: modules,
      timestamp: new Date().toISOString(),
    });
  });

  // Add module to rack
  router.post('/', (req: Request, res: Response) => {
    try {
      const body = AddModuleSchema.parse(req.body);

      // Validate module number
      if (!MODULE_CATALOG[body.moduleNumber]) {
        return res.status(400).json({
          success: false,
          error: `Unknown module number: ${body.moduleNumber}`,
          timestamp: new Date().toISOString(),
        });
      }

      const module = rackManager.addModule(body.moduleNumber, body.slotPosition, body.label);
      if (!module) {
        return res.status(400).json({
          success: false,
          error: 'Failed to add module. Ensure a rack is loaded.',
          timestamp: new Date().toISOString(),
        });
      }

      res.status(201).json({
        success: true,
        data: module,
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

  // Remove module from rack
  router.delete('/:moduleId', (req: Request, res: Response) => {
    const { moduleId } = req.params;
    const removed = rackManager.removeModule(moduleId);

    if (!removed) {
      return res.status(404).json({
        success: false,
        error: 'Module not found',
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
    });
  });

  // Get specific module state
  router.get('/:moduleId/state', (req: Request, res: Response) => {
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

  return router;
}
