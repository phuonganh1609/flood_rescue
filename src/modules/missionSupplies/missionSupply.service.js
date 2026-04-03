// services/missionSupply.service.js
import MissionSupplyRepository from "./missionSupply.repository.js";
import paginationUtils from "../../utils/pagination.js";

class MissionSupplyService {
  async getMissionSupplies(query) {
    const { missionId, status, page, limit } = query;
    const filter = {};

    if (missionId) filter.missionId = missionId;
    if (status && status.length > 0) {
      filter.status = status.length === 1 ? status[0] : { $in: status };
    }

    const usePagination = page !== undefined || limit !== undefined;
    let meta = null;
    let data;

    if (usePagination) {
      const { page: p, limit: l, skip } = paginationUtils.getPaginationParams(query);
      const total = await MissionSupplyRepository.count(filter);
      data = await MissionSupplyRepository.findAll(filter, skip, l, true);
      meta = paginationUtils.buildPaginationMeta({ page: p, limit: l, total });
    } else {
      data = await MissionSupplyRepository.findAll(filter);
    }

    return { data, meta };
  }

  async allocateSupply(id, allocationData, userId) {
    // Logic: Khi Manager cấp phát vật tư từ Warehouse
    const updateData = {
      ...allocationData,
      status: "ALLOCATED",
      allocatedBy: userId,
      allocatedAt: new Date(),
    };
    return await MissionSupplyRepository.update(id, updateData);
  }
}

export default new MissionSupplyService();