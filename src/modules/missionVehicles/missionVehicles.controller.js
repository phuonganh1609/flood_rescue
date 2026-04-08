import { missionVehicleService } from "./missionVehicles.service.js";
import { assignVehicleSchema } from "./missionVehicles.validation.js";

export const missionVehicleController = {
  async assign(req, res) {
    try {
      const { error } = assignVehicleSchema.validate(req.body);
      if (error) throw new Error(error.message);

      const data = await missionVehicleService.assignVehicle(req.body);

      res.json({ data, message: "Vehicle assigned" });

    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  },

  async start(req, res) {
    try {
      const data = await missionVehicleService.startMission(req.params.id);
      res.json({ data, message: "Mission started" });
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  },

  async finish(req, res) {
    try {
      const data = await missionVehicleService.finishMission(req.params.id);
      res.json({ data, message: "Mission finished" });
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
};