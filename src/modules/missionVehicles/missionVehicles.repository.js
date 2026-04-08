import MissionVehicle from "./missionVehicles.model.js";

export const missionVehicleRepository = {
  create(data, session) {
    return MissionVehicle.create([data], { session }).then(res => res[0]);
  },

  findById(id, session) {
    return MissionVehicle.findById(id).session(session);
  },

  findActiveByVehicle(vehicleId, session) {
    return MissionVehicle.findOne({
      vehicleId,
      status: { $in: ["ASSIGNED", "IN_PROGRESS"] }
    }).session(session);
  },

  updateStatus(id, status, session) {
    return MissionVehicle.findByIdAndUpdate(
      id,
      { status },
      { new: true, session }
    );
  },

  finishMission(id, session) {
    return MissionVehicle.findByIdAndUpdate(
      id,
      { status: "DONE", endTime: new Date() },
      { new: true, session }
    );
  }
};