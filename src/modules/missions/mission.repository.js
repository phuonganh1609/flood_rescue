import Mission from "./mission.model.js";

class MissionRepository {
  async create(data) {
    const mission = new Mission(data);
    return await mission.save();
  }

  async findAll(filter = {}, pagination = { page: 1, limit: 10 }) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const missions = await Mission.find(filter)
      .populate("coordinatorId", "displayName userName email phoneNumber")
      .populate({ path: "comboSupplyId", select: "name incidentType supplies", populate: { path: "supplies.supplyId", select: "name unit category" } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Mission.countDocuments(filter);

    return {
      data: missions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id) {
    return await Mission.findById(id)
      .populate("coordinatorId", "displayName userName email phoneNumber")
      .populate({ path: "comboSupplyId", select: "name incidentType supplies", populate: { path: "supplies.supplyId", select: "name unit category" } });
  }

  async findByCode(code) {
    return await Mission.findOne({ code })
      .populate("coordinatorId", "displayName userName email phoneNumber")
      .populate({ path: "comboSupplyId", select: "name incidentType supplies", populate: { path: "supplies.supplyId", select: "name unit category" } });
  }

  async update(id, data) {
    return await Mission.findByIdAndUpdate(id, data, { new: true })
      .populate("coordinatorId", "displayName userName email phoneNumber")
      .populate({ path: "comboSupplyId", select: "name incidentType supplies", populate: { path: "supplies.supplyId", select: "name unit category" } });
  }

  async delete(id) {
    return await Mission.findByIdAndDelete(id);
  }
}

export default new MissionRepository();
