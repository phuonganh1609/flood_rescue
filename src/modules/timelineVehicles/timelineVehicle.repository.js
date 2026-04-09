import TimelineVehicle from "./timelineVehicle.model.js";

class TimelineVehicleRepository {
  async getByTimelineId(timelineId) {
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

  async findOneByTimelineAndMissionVehicle(timelineId, missionVehicleId, session = null) {
    return await TimelineVehicle.findOne({ timelineId, missionVehicleId }).session(session);
  }

  async create(data, session = null) {
    const result = await TimelineVehicle.create([data], { session });
    return result[0];
  }

  async countByMissionVehicle(missionVehicleId, session = null) {
    return await TimelineVehicle.countDocuments({ missionVehicleId }).session(session);
  }

  async countReturnedByMissionVehicle(missionVehicleId, session = null) {
    return await TimelineVehicle.countDocuments({ missionVehicleId, returnedAt: { $ne: null } }).session(session);
  }
}

export const timelineVehicleRepository = new TimelineVehicleRepository();
