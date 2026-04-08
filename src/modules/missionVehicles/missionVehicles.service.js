import mongoose from "mongoose";
import { missionVehicleRepository } from "./missionVehicles.repository.js";
import { vehicleRepository } from "../vehicles/vehicle.repository.js";

export const missionVehicleService = {
  async assignVehicle({ missionId, userId, location }) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { lat, lng } = location;

      // 🔥 tìm xe gần nhất
      const vehicle = await vehicleRepository.findNearestAvailableVehicle(
        lng,
        lat,
        session
      );

      if (!vehicle) throw new Error("No available vehicle");

      // 🔥 tạo missionVehicle
      const missionVehicle = await missionVehicleRepository.create(
        {
          missionId,
          vehicleId: vehicle._id,
          assignedTo: userId,
          status: "ASSIGNED",
          startTime: new Date()
        },
        session
      );

      // 👉 update vehicle (optional nhưng nên có)
      await vehicleRepository.updateStatus(
        vehicle._id,
        "IN_USE",
        userId,
        session
      );

      await session.commitTransaction();
      session.endSession();

      return missionVehicle;

    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  },

  async startMission(missionVehicleId) {
    return missionVehicleRepository.updateStatus(
      missionVehicleId,
      "IN_PROGRESS"
    );
  },

  async finishMission(missionVehicleId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const mv = await missionVehicleRepository.findById(
        missionVehicleId,
        session
      );

      if (!mv) throw new Error("MissionVehicle not found");

      // finish missionVehicle
      const updated = await missionVehicleRepository.finishMission(
        missionVehicleId,
        session
      );

      // release vehicle
      await vehicleRepository.updateStatus(
        mv.vehicleId,
        "ACTIVE",
        null,
        session
      );

      await session.commitTransaction();
      session.endSession();

      return updated;

    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  }
};