import express from "express";
import { authenticate, authorize } from "../../middlewares/authMiddleware.js";
import multer from "multer";
import {
  addSupply,
  getSupply,
  getAllSupplies,
  updateSupply,
  deleteSupply,
  getSupplyByRequestStatus,
  importSuppliesFromExcel,
} from "./supply.controller.js";

const router = express.Router();
// multer config
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Create a new supply
router.post("/", authenticate, authorize(["Manager"]), addSupply);

// Get all supplies
router.get("/list", authenticate,  authorize(["Manager"]),getAllSupplies);

// get supply by request type (specific route first)
router.get("/status/:status", authenticate, authorize(["Manager"]), getSupplyByRequestStatus); 

// Import supplies from Excel
router.post(
  "/import",
  authenticate,
  authorize(["Manager"]),
  upload.single("file"),
  importSuppliesFromExcel
);

// Get supply by id
router.get("/:supplyName", authenticate, authorize(["Manager"]), getSupply);

// Update supply
router.put("/:supplyId", authenticate, authorize(["Manager"]), updateSupply);

// Delete supply
router.delete("/:supplyId", authenticate, authorize(["Manager"]), deleteSupply);


export default router;
