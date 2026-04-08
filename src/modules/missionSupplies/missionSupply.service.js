import { missionSupplyRepository } from "./missionSupply.repository.js";

class MissionSupplyService {
  async getMissionSupplies(query) {
    const { status, page, limit } = query;
    const filter = {};
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit) || 0;
    const l = parseInt(limit) || 100;

    const data = await missionSupplyRepository.findAll(filter, skip, l);
    const total = await missionSupplyRepository.count(filter);

    return {
      data,
      meta: {
        total,
        page: parseInt(page) || 1,
        limit: l
      }
    };
  }

  async allocateSupply(id, allocationData, userId) {
    const updateData = {
      warehouseId: allocationData.warehouseId,
      allocatedQty: allocationData.allocatedQty, // Khớp field Model mới
      status: "ALLOCATED",
      allocatedBy: userId,
      allocatedAt: new Date(),
    };
    return await missionSupplyRepository.update(id, updateData);
  }
}

export const missionSupplyService = new MissionSupplyService();