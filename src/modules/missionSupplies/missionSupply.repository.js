import MissionSupply from "./missionSupply.model.js";

class MissionSupplyRepository {
  async findAll(filter, skip = 0, limit = 100) {
    return await MissionSupply.find(filter)
      .populate("missionId", "name code")
      .populate("supplyId", "name unit category")
      .populate("warehouseId", "name")
      .populate("teamId", "name")
      .populate("comboSupplyId", "name incidentType")
      .skip(skip)
      .limit(limit)
      .sort({ missionId: 1, createdAt: -1 });
  }

  async count(filter) {
    return await MissionSupply.countDocuments(filter);
  }

  async create(data) {
    // data can be an array (insertMany) or single object
    return await MissionSupply.create(data);
  }

  async update(id, updateData) {
    return await MissionSupply.findByIdAndUpdate(id, updateData, { new: true })
      .populate("supplyId", "name unit category")
      .populate("warehouseId", "name")
      .populate("teamId", "name");
  }

  async findByMissionAndTeam(missionId, teamId) {
    return await MissionSupply.find({ missionId, teamId, status: "REQUESTED" })
      .populate("supplyId", "name unit category")
      .populate("warehouseId", "name")
      .populate("comboSupplyId", "name incidentType");
  }

  async findById(id) {
    return await MissionSupply.findById(id)
      .populate("supplyId", "name unit category")
      .populate("warehouseId", "name")
      .populate("teamId", "name")
      .populate("missionId", "name code");
  }
}

export const missionSupplyRepository = new MissionSupplyRepository();