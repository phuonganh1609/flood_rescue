import express from "express";
import { authenticate, authorize } from "../../middlewares/authMiddleware.js";
import multer from "multer";
import {
  addVehicle,
  getVehicle,
  getAllVehicles,
  getVehiclesByType,
  getVehiclesByStatus,
  getVehiclesByTeam,
  getVehicleStats,
  getVehiclesNeedingMaintenance,
  importVehiclesFromExcel,
  updateVehicle,
  assignVehicleToTeam,
  updateMaintenanceStatus,
  deleteVehicle
} from "./vehicle.controller.js";

const router = express.Router();
// multer config
const storage = multer.memoryStorage();
const upload = multer({ storage });
// ─── Create ────────────────────────────────────────────────
router.post("/", authenticate, authorize(["Manager"]), addVehicle);
// Import supplies from Excel
router.post(
  "/import",
  authenticate,
  authorize(["Manager"]),
  upload.single("file"),
  importVehiclesFromExcel
);

// ─── Read ──────────────────────────────────────────────────

// Get vehicles needing maintenance (specific route first)
router.get(
  "/maintenance/needed",
  authenticate,
  authorize(["Manager"]),
  getVehiclesNeedingMaintenance
);

// Get vehicle stats
router.get("/stats", authenticate, authorize(["Manager"]), getVehicleStats);

// Get all vehicles
router.get("/list", authenticate, authorize(["Manager", "Admin"]), getAllVehicles);

// Get vehicles by type
router.get(
  "/type/:type",
  authenticate,
  authorize(["Manager"]),
  getVehiclesByType
);

// Get vehicles by status
router.get(
  "/status/:status",
  authenticate,
  authorize(["Manager"]),
  getVehiclesByStatus
);

// Get vehicles assigned to team
router.get(
  "/team/:teamId",
  authenticate,
  authorize(["Manager"]),
  getVehiclesByTeam
);

// Get vehicle by ID
router.get("/:licensePlate", authenticate, authorize(["Manager"]), getVehicle);

// ─── Update ────────────────────────────────────────────────
router.put(
  "/:vehicleId",
  authenticate,
  authorize(["Manager"]),
  updateVehicle
);

// Assign vehicle to team
router.patch(
  "/:vehicleId/assign",
  authenticate,
  authorize(["Manager"]),
  assignVehicleToTeam
);

// Update maintenance status
router.patch(
  "/:vehicleId/maintenance",
  authenticate,
  authorize(["Manager"]),
  updateMaintenanceStatus
);

// ─── Delete ────────────────────────────────────────────────
router.delete(
  "/:vehicleId",
  authenticate,
  authorize(["Manager"]),
  deleteVehicle
);

export default router;
