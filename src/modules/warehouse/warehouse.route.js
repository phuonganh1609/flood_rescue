import express from 'express';
import {add, getByName, getAll, update, remove, updateWarehouseStatus,removeWarehouseMaintenance,setWarehouseMaintenance } from './warehouse.controller.js';
import { authenticate, authorize } from '../../middlewares/authMiddleware.js';

const router = express.Router();

// Warehouse routes
router.post(
  '/',
  authenticate,
  authorize(['Manager', 'Admin']), add
);

router.get(
  '/name',
  authenticate,
  authorize(['Manager', 'Admin', 'Rescue Coordinator']),getByName
);
router.get(
  '/',
  authenticate,
  authorize(['Manager', 'Admin', 'Rescue Coordinator']),getAll
);


router.put(
  '/:name',
  authenticate,
  authorize(['Manager', 'Admin']),
  update
);

router.delete(
  '/:name',
  authenticate,
  authorize(['Manager', 'Admin']),remove
);
// auto calc status
router.patch("/:id/status", updateWarehouseStatus);

// manual maintenance
router.patch("/:id/maintenance", setWarehouseMaintenance);

// remove maintenance
router.patch("/:id/maintenance/remove", removeWarehouseMaintenance);

export default router;
