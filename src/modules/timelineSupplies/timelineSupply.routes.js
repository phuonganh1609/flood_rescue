import express from 'express';
import { claimSupply, returnSupply, getTimelineSupplies, approveSupply, rejectSupply } from './timelineSupply.controller.js';
import { authenticate, authorize } from "../../middlewares/authMiddleware.js";

const router = express.Router();

// Get supplies claimed by timeline
router.get('/', authenticate, authorize(['Rescue Team', 'Manager', 'Admin', 'Rescue Coordinator']), getTimelineSupplies);

// Manager approves/rejects supply reservations
router.patch('/:id/approve', authenticate, authorize(['Manager', 'Admin']), approveSupply);
router.patch('/:id/reject', authenticate, authorize(['Manager', 'Admin']), rejectSupply);

// Rescue Teams claim supplies (pickup from warehouse)
router.patch('/:id/claim', authenticate, authorize(['Rescue Team']), claimSupply);

// Rescue Teams return leftover supplies
router.patch('/:id/return', authenticate, authorize(['Rescue Team']), returnSupply);

export default router;
