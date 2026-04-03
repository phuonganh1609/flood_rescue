// repositories/missionSupply.repository.js
import MissionSupply from "./missionSupply.model.js";

class MissionSupplyRepository {
  async findAll(filter, skip, limit, usePagination) {
    const queryBuilder = MissionSupply.find(filter)
      .populate("missionId", "name code status type priority")
      .populate("supplyId", "name unit category")
      .populate("warehouseId", "name location status")
      .sort({ createdAt: 1 });

    if (usePagination) {
      queryBuilder.skip(skip).limit(limit);
    }

    return await queryBuilder;
  }

  async count(filter) {
    return await MissionSupply.countDocuments(filter);
  }

  async findById(id) {
    return await MissionSupply.findById(id)
      .populate("missionId")
      .populate("supplyId");
  }

  async create(data) {
    return await MissionSupply.create(data);
  }

  async update(id, updateData) {
    return await MissionSupply.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });
  }
}

export default new MissionSupplyRepository();