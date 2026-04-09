import mongoose from "mongoose";
import { timelineVehicleRepository } from "./timelineVehicle.repository.js";
import Vehicle from "../vehicles/vehicle.model.js";
import TimelineVehicle, { TIMELINE_VEHICLE_STATUS } from "./timelineVehicle.model.js";

class TimelineVehicleService {
  async claimVehicle(timelineVehicleId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const timelineVehicle = await TimelineVehicle.findById(timelineVehicleId).session(session);
      if (!timelineVehicle) throw new Error("TimelineVehicle not found");
      if (timelineVehicle.status !== TIMELINE_VEHICLE_STATUS.APPROVED) {
        throw new Error(`Cannot claim: current status is ${timelineVehicle.status}, expected APPROVED`);
      }

      timelineVehicle.claimedAt = new Date();
      timelineVehicle.status = TIMELINE_VEHICLE_STATUS.CLAIMED;
      await timelineVehicle.save({ session });

      await session.commitTransaction();
      session.endSession();
      return timelineVehicle;
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  }

  async returnVehicle(timelineVehicleId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const timelineVehicle = await TimelineVehicle.findById(timelineVehicleId).session(session);
      if (!timelineVehicle) throw new Error("TimelineVehicle not found");
      if (timelineVehicle.status !== TIMELINE_VEHICLE_STATUS.CLAIMED) {
        throw new Error(`Cannot return: current status is ${timelineVehicle.status}, expected CLAIMED`);
      }

      timelineVehicle.returnedAt = new Date();
      timelineVehicle.status = TIMELINE_VEHICLE_STATUS.RETURNED;
      await timelineVehicle.save({ session });

      // Return vehicle to ACTIVE status
      await Vehicle.findByIdAndUpdate(
        timelineVehicle.vehicleId,
        { status: "ACTIVE" },
        { session }
      );

      await session.commitTransaction();
      session.endSession();
      return timelineVehicle;
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  }

  async getTimelineVehicles(timelineId) {
    return await timelineVehicleRepository.findByTimeline(timelineId);
  }

  async approveVehicle(timelineVehicleId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const timelineVehicle = await TimelineVehicle.findById(timelineVehicleId).session(session);
      if (!timelineVehicle) throw new Error("TimelineVehicle not found");
      if (timelineVehicle.status !== TIMELINE_VEHICLE_STATUS.RESERVED) {
        throw new Error(`Cannot approve: current status is ${timelineVehicle.status}, expected RESERVED`);
      }

      // Update vehicle status to IN_USE
      await Vehicle.findByIdAndUpdate(
        timelineVehicle.vehicleId,
        { status: "IN_USE" },
        { session }
      );

      timelineVehicle.status = TIMELINE_VEHICLE_STATUS.APPROVED;
      await timelineVehicle.save({ session });

      // Check if all supplies AND vehicles for this timeline are approved/rejected
      const TimelineSupply = (await import("../timelineSupplies/timelineSupply.model.js")).default;
      const { TIMELINE_SUPPLY_STATUS } = await import("../timelineSupplies/timelineSupply.model.js");
      const { TIMELINE_STATUS } = await import("../timelines/timeline.model.js");
      const { timelineRepository } = await import("../timelines/timeline.repository.js");
      
      const allSupplies = await TimelineSupply.find({ timelineId: timelineVehicle.timelineId }).session(session);
      const allVehicles = await TimelineVehicle.find({ timelineId: timelineVehicle.timelineId }).session(session);
      
      const suppliesReviewed = allSupplies.every(s => 
        s.status === TIMELINE_SUPPLY_STATUS.APPROVED || s.status === TIMELINE_SUPPLY_STATUS.REJECTED
      );
      const vehiclesReviewed = allVehicles.every(v =>
        v.status === TIMELINE_VEHICLE_STATUS.APPROVED || v.status === TIMELINE_VEHICLE_STATUS.REJECTED
      );
      const hasApprovedSupply = allSupplies.some(s => s.status === TIMELINE_SUPPLY_STATUS.APPROVED);
      const hasApprovedVehicle = allVehicles.some(v => v.status === TIMELINE_VEHICLE_STATUS.APPROVED);

      // Only auto-transition if ALL items reviewed AND at least one approved
      if (suppliesReviewed && vehiclesReviewed && (hasApprovedSupply || hasApprovedVehicle)) {
        await timelineRepository.transitionStatus(
          timelineVehicle.timelineId,
          TIMELINE_STATUS.PENDING_APPROVAL,
          { status: TIMELINE_STATUS.CLAIMING_SUPPLIES },
          session
        );
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

  async rejectVehicle(timelineVehicleId, rejectionData = {}) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const timelineVehicle = await TimelineVehicle.findById(timelineVehicleId).session(session);
      if (!timelineVehicle) throw new Error("TimelineVehicle not found");
      if (timelineVehicle.status !== TIMELINE_VEHICLE_STATUS.RESERVED) {
        throw new Error(`Cannot reject: current status is ${timelineVehicle.status}, expected RESERVED`);
      }

      // Vehicle stays ACTIVE (no change needed)
      timelineVehicle.status = TIMELINE_VEHICLE_STATUS.REJECTED;
      if (rejectionData.note) {
        timelineVehicle.note = rejectionData.note;
      }
      await timelineVehicle.save({ session });

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