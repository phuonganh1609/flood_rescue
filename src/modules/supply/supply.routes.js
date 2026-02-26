import express from "express";
import { authenticate, authorize } from "../../middlewares/authMiddleware.js";
import {
  addSupply,
  getSupply,
  getAllSupplies,
  getSupplyByRequestType,
  updateSupply,
  deleteSupply
} from "./supply.controller.js";

const router = express.Router();

// Create a new supply
router.post("/", authenticate, authorize(["Manager"]), addSupply);

// Get all supplies
router.get("/", authenticate, getAllSupplies);

// get supply by request type (specific route first)
router.get("/type/:type", authenticate, getSupplyByRequestType);

// Get supply by id
router.get("/:supplyId", authenticate, getSupply);

// Update supply
router.put("/:supplyId", authenticate, authorize(["Manager"]), updateSupply);

// Delete supply
router.delete("/:supplyId", authenticate, authorize(["Manager"]), deleteSupply);

export default router;
