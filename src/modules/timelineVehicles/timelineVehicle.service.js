import mongoose from "mongoose";
import TimelineVehicle from "./timelineVehicle.model.js";
import Timeline from "../timelines/timeline.model.js";
import MissionVehicle from "../missionVehicles/missionVehicles.model.js";
import { vehicleRepository } from "../vehicles/vehicle.repository.js";

class TimelineVehicleService {
  async getTimelineVehicles(timelineId) {
    return await TimelineVehicle.find({ timelineId })
      .populate({
        path: "missionVehicleId",
        populate: [
          { path: "vehicleId", select: "licensePlate type capacity location" },
        ],
      })
      .populate("vehicleId", "licensePlate type capacity location")
      .sort({ claimedAt: -1 });
  }

  async claimVehicle(timelineId, missionVehicleId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Validate Timeline exists
      const timeline = await Timeline.findById(timelineId).session(session);
      if (!timeline) throw new Error("Timeline not found");

      // 2. Validate MissionVehicle
      const missionVehicle = await MissionVehicle.findById(missionVehicleId).session(session);
      if (!missionVehicle) throw new Error("MissionVehicle not found");
      if (missionVehicle.status !== "ASSIGNED" && missionVehicle.status !== "IN_PROGRESS") {
        throw new Error("Vehicle is not available for claiming");
      }

      // 3. Ensure not claimed before
      const existing = await TimelineVehicle.findOne({ timelineId, missionVehicleId }).session(session);
      if (existing) throw new Error("This team already claimed this mission vehicle");

      // 4. Create TimelineVehicle
      const timelineVehicle = await TimelineVehicle.create([{
        timelineId,
        missionVehicleId,
        vehicleId: missionVehicle.vehicleId,
        claimedAt: new Date()
      }], { session });
      
      // 5. Update MissionVehicle status if it was just assigned
      if (missionVehicle.status === "ASSIGNED") {
        missionVehicle.status = "IN_PROGRESS";
        await missionVehicle.save({ session });
      }

      await session.commitTransaction();
      session.endSession();
      return timelineVehicle[0];
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  }

  async returnVehicle(timelineId, missionVehicleId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Find TimelineVehicle
      const timelineVehicle = await TimelineVehicle.findOne({ timelineId, missionVehicleId }).session(session);
      if (!timelineVehicle) throw new Error("Vehicle claim record not found");
      if (timelineVehicle.returnedAt) throw new Error("Vehicle already returned");

      // 2. Update TimelineVehicle
      timelineVehicle.returnedAt = new Date();
      await timelineVehicle.save({ session });

      // 3. Check if we need to release the vehicle
      // If it's returned by all timelines, we can finish the mission vehicle
      const totalTimelinesCount = await TimelineVehicle.countDocuments({ missionVehicleId }).session(session);
      const returnedTimelinesCount = await TimelineVehicle.countDocuments({ missionVehicleId, returnedAt: { $ne: null } }).session(session);
      
      if (totalTimelinesCount > 0 && totalTimelinesCount === returnedTimelinesCount) {
        const missionVehicle = await MissionVehicle.findById(missionVehicleId).session(session);
        if (missionVehicle) {
           missionVehicle.status = "DONE";
           await missionVehicle.save({ session });
           
           // Release vehicle
           await vehicleRepository.updateStatus(
             missionVehicle.vehicleId,
             "ACTIVE",
             null,
             session
           );
        }
      }

      await session.commitTransaction();
      session.endSession();

      return timelineVehicle;
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  }
}

export const timelineVehicleService = new TimelineVehicleService();
