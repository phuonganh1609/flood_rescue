import express from 'express';
import {
    createComboSupply,
    getComboSupplies,
    getComboSupplyById,
    updateComboSupply,
    deleteComboSupply
} from './comboSupply.controller.js';
import { authenticate, authorize } from "../../middlewares/authMiddleware.js";

const router = express.Router();

// Public read: Citizen & Rescue Team can fetch combos by incidentType to see what supplies are in a combo
router.get(
  '/',
  authenticate,
  authorize(['Manager', 'Admin', 'Rescue Coordinator', 'Rescue Team', 'Citizen']),
  getComboSupplies
);

router.get(
  '/:id',
  authenticate,
  authorize(['Manager', 'Admin', 'Rescue Coordinator', 'Rescue Team']),
  getComboSupplyById
);

// Manager/Admin only: CRUD
router.post('/', authenticate, authorize(['Manager', 'Admin']), createComboSupply);
router.put('/:id', authenticate, authorize(['Manager', 'Admin']), updateComboSupply);
router.delete('/:id', authenticate, authorize(['Manager', 'Admin']), deleteComboSupply);

export default router;
