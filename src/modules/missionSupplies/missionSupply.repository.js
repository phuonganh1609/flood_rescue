import MissionSupply from "./missionSupply.model.js";

class MissionSupplyRepository {
  async findAll(filter, skip = 0, limit = 100) {
    return await MissionSupply.find(filter)
      .populate("missionId", "name code") // Lấy name để hiện ở cột Mission
      .populate("supplyId", "name unit category") // Lấy name, unit để hiện "gói/hộp"
      .populate("warehouseId", "name")
      .skip(skip)
      .limit(limit)
      .sort({ missionId: 1, createdAt: -1 }); // Gom các vật tư cùng Mission lại gần nhau
  }

  async count(filter) {
    return await MissionSupply.countDocuments(filter);
  }

  async create(data) {
    // Xử lý nếu data là mảng (insertMany) hoặc object đơn
    return await MissionSupply.create(data);
  }

  async update(id, updateData) {
    return await MissionSupply.findByIdAndUpdate(id, updateData, { new: true });
  }
}

export const missionSupplyRepository = new MissionSupplyRepository();