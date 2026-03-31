import mongoose from "mongoose";
import TimelineSupply from "./timelineSupply.model.js";
import MissionSupply from "../missionSupplies/missionSupply.model.js";
import InventoryItem from "../inventory/inventoryItem.model.js";
import Supply from "../supply/supply.model.js";
import Timeline from "../timelines/timeline.model.js";
import TeamRequest from "../teamRequests/teamRequest.model.js";

class TimelineSupplyService {
  async claimSupply(timelineId, missionSupplyId, carriedQty) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      if (carriedQty <= 0) throw new Error("Carried quantity must be greater than zero");

      // 1. Validate Timeline exists
      const timeline = await Timeline.findById(timelineId).session(session);
      if (!timeline) throw new Error("Timeline not found");

      // 2. Validate MissionSupply
      const missionSupply = await MissionSupply.findById(missionSupplyId).session(session);
      if (!missionSupply) throw new Error("MissionSupply not found");
      if (missionSupply.status !== "ALLOCATED" && missionSupply.status !== "FULLY_CLAIMED") {
        throw new Error("Supply not allocated by Manager yet");
      }

      // 3. Ensure not claimed before
      const existing = await TimelineSupply.findOne({ timelineId, missionSupplyId }).session(session);
      if (existing) throw new Error("This team already claimed this mission supply");

      // 4. Validate quantity
      const availableToClaim = missionSupply.allocatedQty - missionSupply.claimedQty;
      if (carriedQty > availableToClaim) {
        throw new Error(`Cannot claim more than available. Only ${availableToClaim} left to claim.`);
      }

      // 5. Create TimelineSupply
      const timelineSupply = await TimelineSupply.create([{
        timelineId,
        missionSupplyId,
        supplyId: missionSupply.supplyId,
        carriedQty,
        claimedAt: new Date()
      }], { session });

      // 6. Update MissionSupply
      missionSupply.claimedQty += carriedQty;
      if (missionSupply.claimedQty === missionSupply.allocatedQty) {
        missionSupply.status = "FULLY_CLAIMED";
      }
      await missionSupply.save({ session });

      // 7. Update InventoryItem (deduct from quantity and reservedQuantity)
      const inventoryItem = await InventoryItem.findById(missionSupply.inventoryItemId).session(session);
      if (inventoryItem) {
        inventoryItem.quantity -= carriedQty;
        inventoryItem.reservedQuantity -= carriedQty;
        // Adjust status if needed
        if (inventoryItem.quantity - inventoryItem.reservedQuantity === 0 && inventoryItem.reservedQuantity === 0) {
          inventoryItem.status = "OUT_OF_STOCK";
        }
        await inventoryItem.save({ session });
      }

      await session.commitTransaction();
      session.endSession();
      return timelineSupply[0];
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  }

  async returnSupply(timelineId, missionSupplyId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Find TimelineSupply
      const timelineSupply = await TimelineSupply.findOne({ timelineId, missionSupplyId }).session(session);
      if (!timelineSupply) throw new Error("Supply claim record not found");
      if (timelineSupply.returnedAt) throw new Error("Supply already returned");

      // 2. Need to know supply name to find distributed quantity
      const supply = await Supply.findById(timelineSupply.supplyId).session(session);
      if (!supply) throw new Error("Supply definition not found");

      // 3. Find TeamRequests to sum up distributed quantities
      const timeline = await Timeline.findById(timelineId).session(session);
      const teamRequests = await TeamRequest.find({
        missionId: timeline.missionId,
        teamId: timeline.teamId
      }).session(session);

      let totalDistributed = 0;
      for (const tr of teamRequests) {
        const supplyDelivered = tr.suppliesDeliveredTotal.find(s => s.name === supply.name);
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
      await timelineSupply.save({ session });

      // 6. Return to Inventory if > 0
      let missionSupply = null;
      if (returnedQty > 0) {
        missionSupply = await MissionSupply.findById(missionSupplyId).session(session);
        const inventoryItem = await InventoryItem.findById(missionSupply.inventoryItemId).session(session);
        if (inventoryItem) {
          inventoryItem.quantity += returnedQty;
          inventoryItem.status = "ACTIVE"; // because we just added items back
          await inventoryItem.save({ session });
        }
      }

      // 7. Check if all timelines returned to update MissionSupply status to RETURNED
      const totalTimelinesCount = await TimelineSupply.countDocuments({ missionSupplyId }).session(session);
      const returnedTimelinesCount = await TimelineSupply.countDocuments({ missionSupplyId, returnedAt: { $ne: null } }).session(session);
      
      if (totalTimelinesCount > 0 && totalTimelinesCount === returnedTimelinesCount) {
        if (!missionSupply) {
          missionSupply = await MissionSupply.findById(missionSupplyId).session(session);
        }
        if (missionSupply) {
          missionSupply.status = "RETURNED";
          await missionSupply.save({ session });
        }
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
