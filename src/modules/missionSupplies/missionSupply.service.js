import { missionSupplyRepository } from "./missionSupply.repository.js";

class MissionSupplyService {
  async getMissionSupplies(query) {
    const { status, page, limit, missionId, teamId } = query;
    const filter = {};

    // status can be comma-separated array
    if (status && status.length > 0) {
      filter.status = Array.isArray(status) ? { $in: status } : { $in: [status] };
    }
    if (missionId) filter.missionId = missionId;
    if (teamId) filter.teamId = teamId;

    const l = parseInt(limit) || 100;
    const p = parseInt(page) || 1;
    const skip = (p - 1) * l;

    const data = await missionSupplyRepository.findAll(filter, skip, l);
    const total = await missionSupplyRepository.count(filter);

    return {
      data,
      meta: {
        total,
        page: p,
        limit: l,
      },
    };
  }

  /**
   * Manager approves a supply request from a team.
   * Updates the MissionSupply record with allocatedQty, warehouseId (if changed), and sets status ALLOCATED.
   */
  async allocateSupply(id, allocationData, userId) {
    const supply = await missionSupplyRepository.findById(id);
    if (!supply) {
      const error = new Error("MissionSupply not found");
      error.statusCode = 404;
      throw error;
    }

    if (supply.status !== "REQUESTED") {
      const error = new Error(
        `Cannot allocate: current status is ${supply.status}, expected REQUESTED`
      );
      error.statusCode = 400;
      throw error;
    }

    const updateData = {
      allocatedQty: allocationData.allocatedQty,
      status: "ALLOCATED",
      allocatedBy: userId,
      allocatedAt: new Date(),
    };

    // Allow manager to change warehouse if needed
    if (allocationData.warehouseId) {
      updateData.warehouseId = allocationData.warehouseId;
    }

    return await missionSupplyRepository.update(id, updateData);
  }

  /**
   * @deprecated This method is no longer used. Combo supplies are now expanded
   * into TimelineSupply records when teams accept timelines.
   * Called when team accepts a timeline.
   * Expands the comboSupply into individual MissionSupply records.
   */
  async createComboSupplyRequest({ missionId, teamId, comboSupply, warehouseId, createdBy }) {
    if (!comboSupply || !comboSupply.supplies || comboSupply.supplies.length === 0) {
      return [];
    }

    const records = comboSupply.supplies.map((item) => ({
      missionId,
      teamId,
      comboSupplyId: comboSupply._id,
      supplyId: item.supplyId._id || item.supplyId,
      requestedQty: item.quantity,
      warehouseId: warehouseId || null,
      status: "REQUESTED",
      createdBy,
    }));

    return await missionSupplyRepository.create(records);
  }
}

export const missionSupplyService = new MissionSupplyService();