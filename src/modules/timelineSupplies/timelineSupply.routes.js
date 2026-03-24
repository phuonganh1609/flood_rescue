import express from 'express';
import { claimSupply, returnSupply } from './timelineSupply.controller.js';
import { authenticate, authorize } from "../../middlewares/authMiddleware.js";

const router = express.Router();

// Rescue Teams claim sum supplies from allocated total
router.post('/claim', authenticate, authorize(['Rescue Team']), claimSupply);

// Rescue Teams return leftover supplies
router.post('/return', authenticate, authorize(['Rescue Team']), returnSupply);

export default router;
