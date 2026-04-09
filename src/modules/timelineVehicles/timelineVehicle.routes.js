import express from 'express';
import { getTimelineVehicles, claimVehicle, returnVehicle, approveVehicle, rejectVehicle } from './timelineVehicle.controller.js';
import { authenticate, authorize } from "../../middlewares/authMiddleware.js";

const router = express.Router();

// Get vehicles claimed by timeline
router.get('/', authenticate, authorize(['Rescue Team', 'Manager', 'Admin', 'Rescue Coordinator']), getTimelineVehicles);

// Manager approves/rejects vehicle reservations
router.patch('/:id/approve', authenticate, authorize(['Manager', 'Admin']), approveVehicle);
router.patch('/:id/reject', authenticate, authorize(['Manager', 'Admin']), rejectVehicle);

// Rescue Teams claim vehicles (pickup)
router.patch('/:id/claim', authenticate, authorize(['Rescue Team']), claimVehicle);

// Rescue Teams return vehicles
router.patch('/:id/return', authenticate, authorize(['Rescue Team']), returnVehicle);

export default router;
