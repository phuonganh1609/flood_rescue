import express from 'express';
import { claimSupply, returnSupply, getTimelineSupplies } from './timelineSupply.controller.js';
import { authenticate, authorize } from "../../middlewares/authMiddleware.js";

const router = express.Router();

// Get supplies claimed by timeline
router.get('/', authenticate, authorize(['Rescue Team', 'Manager', 'Admin', 'Rescue Coordinator']), getTimelineSupplies);

// Rescue Teams claim sum supplies from allocated total
router.post('/claim', authenticate, authorize(['Rescue Team']), claimSupply);

// Rescue Teams return leftover supplies
router.post('/return', authenticate, authorize(['Rescue Team']), returnSupply);

export default router;
