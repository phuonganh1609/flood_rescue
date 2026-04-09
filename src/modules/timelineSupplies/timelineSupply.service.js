import mongoose from "mongoose";
import TimelineSupply, { TIMELINE_SUPPLY_STATUS } from "./timelineSupply.model.js";
import MissionSupply from "../missionSupplies/missionSupply.model.js";
import InventoryItem from "../inventory/inventoryItem.model.js";
import Supply from "../supply/supply.model.js";
import Timeline from "../timelines/timeline.model.js";
import TeamRequest from "../teamRequests/teamRequest.model.js";

class TimelineSupplyService {
  async getTimelineSupplies(timelineId) {
    return await TimelineSupply.find({ timelineId })
      .populate({
        path: "missionSupplyId",
        populate: [
          { path: "supplyId", select: "name unit category" },
          { path: "warehouseId", select: "name location" },
        ],
      })
      .populate("supplyId", "name unit category")
      .populate("comboSupplyId", "name type")
      .populate("warehouseId", "name location")
      .sort({ claimedAt: -1 });
  }

  async approveSupply(timelineSupplyId, approvalData) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const timelineSupply = await TimelineSupply.findById(timelineSupplyId).session(session);
      if (!timelineSupply) throw new Error("TimelineSupply not found");
      if (timelineSupply.status !== TIMELINE_SUPPLY_STATUS.RESERVED) {
        throw new Error(`Cannot approve: current status is ${timelineSupply.status}, expected RESERVED`);
      }

      const approvedQty = approvalData.approvedQty ?? timelineSupply.requestedQty;
      
      // Validate approvedQty
      if (approvedQty <= 0) {
        throw new Error("Approved quantity must be greater than 0");
      }
      if (approvedQty > timelineSupply.requestedQty) {
        throw new Error(`Approved quantity (${approvedQty}) cannot exceed requested quantity (${timelineSupply.requestedQty})`);
      }
      
      // If manager adjusts quantity down, release the difference from inventory
      if (approvedQty < timelineSupply.requestedQty) {
        const diff = timelineSupply.requestedQty - approvedQty;
        const inventoryItem = await InventoryItem.findById(timelineSupply.inventoryItemId).session(session);
        if (inventoryItem) {
          inventoryItem.reservedQuantity -= diff;
          await inventoryItem.save({ session });
        }
      }

      timelineSupply.approvedQty = approvedQty;
      timelineSupply.status = TIMELINE_SUPPLY_STATUS.APPROVED;
      await timelineSupply.save({ session });

      // Check if all supplies AND vehicles for this timeline are approved/rejected
      const { TIMELINE_STATUS } = await import("../timelines/timeline.model.js");
      const { timelineRepository } = await import("../timelines/timeline.repository.js");
      const TimelineVehicle = (await import("../timelineVehicles/timelineVehicle.model.js")).default;
      const { TIMELINE_VEHICLE_STATUS } = await import("../timelineVehicles/timelineVehicle.model.js");
      
      const allSupplies = await TimelineSupply.find({ timelineId: timelineSupply.timelineId }).session(session);
      const allVehicles = await TimelineVehicle.find({ timelineId: timelineSupply.timelineId }).session(session);
      
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
          timelineSupply.timelineId,
          TIMELINE_STATUS.PENDING_APPROVAL,
          { status: TIMELINE_STATUS.CLAIMING_SUPPLIES },
          session
        );
      }

      await session.commitTransaction();
      session.endSession();
      return timelineSupply;
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  }

  async rejectSupply(timelineSupplyId, rejectionData = {}) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const timelineSupply = await TimelineSupply.findById(timelineSupplyId).session(session);
      if (!timelineSupply) throw new Error("TimelineSupply not found");
      if (timelineSupply.status !== TIMELINE_SUPPLY_STATUS.RESERVED) {
        throw new Error(`Cannot reject: current status is ${timelineSupply.status}, expected RESERVED`);
      }

      // Release reserved inventory
      const inventoryItem = await InventoryItem.findById(timelineSupply.inventoryItemId).session(session);
      if (inventoryItem) {
        inventoryItem.reservedQuantity -= timelineSupply.requestedQty;
        await inventoryItem.save({ session });
      }

      timelineSupply.status = TIMELINE_SUPPLY_STATUS.REJECTED;
      if (rejectionData.note) {
        timelineSupply.note = rejectionData.note;
      }
      await timelineSupply.save({ session });

      await session.commitTransaction();
      session.endSession();
      return timelineSupply;
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  }

  async claimSupply(timelineSupplyId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Find TimelineSupply
      const timelineSupply = await TimelineSupply.findById(timelineSupplyId).session(session);
      if (!timelineSupply) throw new Error("TimelineSupply not found");
      if (timelineSupply.status !== TIMELINE_SUPPLY_STATUS.APPROVED) {
        throw new Error(`Cannot claim: current status is ${timelineSupply.status}, expected APPROVED`);
      }

      // 2. Set carriedQty = approvedQty and update status
      timelineSupply.carriedQty = timelineSupply.approvedQty;
      timelineSupply.claimedAt = new Date();
      timelineSupply.status = TIMELINE_SUPPLY_STATUS.CLAIMED;
      await timelineSupply.save({ session });

      // 3. Update InventoryItem (deduct from quantity and reservedQuantity)
      const inventoryItem = await InventoryItem.findById(timelineSupply.inventoryItemId).session(session);
      if (!inventoryItem) {
        throw new Error(`InventoryItem ${timelineSupply.inventoryItemId} not found - cannot deduct stock`);
      }
      
      inventoryItem.quantity -= timelineSupply.carriedQty;
      inventoryItem.reservedQuantity -= timelineSupply.carriedQty;
      
      // Adjust status if needed
      if (inventoryItem.quantity === 0) {
        inventoryItem.status = "OUT_OF_STOCK";
      }
      await inventoryItem.save({ session });

      await session.commitTransaction();
      session.endSession();
      return timelineSupply;
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  }

  async returnSupply(timelineSupplyId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Find TimelineSupply
      const timelineSupply = await TimelineSupply.findById(timelineSupplyId).session(session);
      if (!timelineSupply) throw new Error("TimelineSupply not found");
      if (timelineSupply.status !== TIMELINE_SUPPLY_STATUS.CLAIMED) {
        throw new Error(`Cannot return: current status is ${timelineSupply.status}, expected CLAIMED`);
      }

      // 2. Get supply info for matching
      const supply = await Supply.findById(timelineSupply.supplyId).session(session);
      if (!supply) throw new Error("Supply definition not found");

      // 3. Find TeamRequests to sum up distributed quantities
      const timeline = await Timeline.findById(timelineSupply.timelineId).session(session);
      const teamRequests = await TeamRequest.find({
        missionId: timeline.missionId,
        teamId: timeline.teamId
      }).session(session);

      let totalDistributed = 0;
      const supplyIdStr = timelineSupply.supplyId.toString();
      
      for (const tr of teamRequests) {
        // Match by supplyId if available, fallback to name for backward compatibility
        const supplyDelivered = tr.suppliesDeliveredTotal.find(s => {
          if (s.supplyId) {
            return s.supplyId.toString() === supplyIdStr;
          }
          // Fallback to name matching for old data
          return s.name === supply.name;
        });
        
        if (supplyDelivered) {
          totalDistributed += supplyDelivered.deliveredQty;
        }
      }

      // 4. Calculate returnedQty
      let returnedQty = timelineSupply.carriedQty - totalDistributed;
      if (returnedQty < 0) {
        console.warn(`Warning: Team distributed (${totalDistributed}) more than carried (${timelineSupply.carriedQty}). Setting return to 0.`);
        returnedQty = 0;
      }

      // 5. Update TimelineSupply
      timelineSupply.returnedQty = returnedQty;
      timelineSupply.returnedAt = new Date();
      timelineSupply.status = TIMELINE_SUPPLY_STATUS.RETURNED;
      await timelineSupply.save({ session });

      // 6. Return to Inventory if > 0
      if (returnedQty > 0) {
        const inventoryItem = await InventoryItem.findById(timelineSupply.inventoryItemId).session(session);
        if (!inventoryItem) {
          throw new Error(`InventoryItem ${timelineSupply.inventoryItemId} not found - cannot return stock`);
        }
        
        inventoryItem.quantity += returnedQty;
        if (inventoryItem.status === "OUT_OF_STOCK") {
          inventoryItem.status = "ACTIVE";
        }
        await inventoryItem.save({ session });
      }

      await session.commitTransaction();
      session.endSession();

      return { timelineSupply, totalDistributed, returnedQty };
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  }
}

export const timelineSupplyService = new TimelineSupplyService();
