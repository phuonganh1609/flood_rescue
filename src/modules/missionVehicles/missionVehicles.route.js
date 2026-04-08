import express from "express";
import { missionVehicleController } from "./missionVehicles.controller.js";

const router = express.Router();

router.post("/assign", missionVehicleController.assign);
router.patch("/start/:id", missionVehicleController.start);
router.patch("/finish/:id", missionVehicleController.finish);

export default router;