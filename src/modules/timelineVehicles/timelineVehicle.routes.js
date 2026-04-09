import express from 'express';
import { claimVehicle, returnVehicle, getTimelineVehicles } from './timelineVehicle.controller.js';
import { authenticate, authorize } from "../../middlewares/authMiddleware.js";

const router = express.Router();

// Get vehicles claimed by timeline
router.get('/', authenticate, authorize(['Rescue Team', 'Manager', 'Admin', 'Rescue Coordinator']), getTimelineVehicles);

// Rescue Teams claim vehicles
router.post('/claim', authenticate, authorize(['Rescue Team']), claimVehicle);

// Rescue Teams return vehicles
router.post('/return', authenticate, authorize(['Rescue Team']), returnVehicle);

export default router;
