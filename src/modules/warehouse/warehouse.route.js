import express from 'express';
import {add, getByName, getAll, update, remove } from './warehouse.controller.js';
import { authenticate, authorize } from '../../middlewares/authMiddleware.js';
import { get } from 'mongoose';

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
  authorize(['Manager', 'Admin', 'Coordinator']),getByName
);
router.get(
  '/',
  authenticate,
  authorize(['Manager', 'Admin', 'Coordinator']),getAll
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

export default router;
