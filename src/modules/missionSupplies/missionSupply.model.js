import mongoose from "mongoose";

const MISSION_SUPPLY_STATUS = {
  REQUESTED: "REQUESTED",
  ALLOCATED: "ALLOCATED",
  FULLY_CLAIMED: "FULLY_CLAIMED",
  RETURNED: "RETURNED",
};

const missionSupplySchema = new mongoose.Schema(
  {
    missionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mission",
      required: true,
      index: true,
    },
    supplyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supply",
      required: true,
      index: true,
    },
    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
      default: null,
    },
    inventoryItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryItem",
      default: null,
    },
    plannedQty: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    allocatedQty: {
      type: Number,
      min: 0,
      default: 0,
    },
    claimedQty: {
      type: Number,
      min: 0,
      default: 0,
    },
    status: {
      type: String,
      enum: Object.values(MISSION_SUPPLY_STATUS),
      default: MISSION_SUPPLY_STATUS.REQUESTED,
    },
    allocatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    allocatedAt: {
      type: Date,
      default: null,
    },
    note: {
      type: String,
      default: null,
      maxlength: 1000,
    },
  },
  { timestamps: true },
);

// Ensure uniqueness: One supply type per mission 
missionSupplySchema.index({ missionId: 1, supplyId: 1 }, { unique: true });

const MissionSupply = mongoose.model("MissionSupply", missionSupplySchema);

export default MissionSupply;
