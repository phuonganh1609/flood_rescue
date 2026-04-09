import mongoose from "mongoose";

export const TIMELINE_SUPPLY_STATUS = {
  RESERVED: "RESERVED",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  CLAIMED: "CLAIMED",
  RETURNED: "RETURNED",
};

const timelineSupplySchema = new mongoose.Schema(
  {
    timelineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Timeline",
      required: true,
      index: true,
    },
    missionSupplyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MissionSupply",
      default: null,
      index: true,
    },
    comboSupplyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ComboSupply",
      default: null,
      index: true,
    },
    comboType: {
      type: String,
      enum: ["Citizen", "Rescue Team"],
      default: null,
    },
    missionRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MissionRequest",
      default: null,
      index: true,
    },
    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
      index: true,
    },
    inventoryItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryItem",
      required: true,
      index: true,
    },
    requestedQty: {
      type: Number,
      required: true,
      min: 0,
    },
    approvedQty: {
      type: Number,
      min: 0,
      default: 0,
    },
    supplyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supply",
      required: true, // Denormalized for query ease
    },
    carriedQty: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    returnedQty: {
      type: Number,
      min: 0,
      default: 0,
    },
    claimedAt: {
      type: Date,
      default: null,
    },
    returnedAt: {
      type: Date,
      default: null,
    },
    note: {
      type: String,
      default: null,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: Object.values(TIMELINE_SUPPLY_STATUS),
      default: TIMELINE_SUPPLY_STATUS.RESERVED,
    },
  },
  { timestamps: true },
);

// Composite indexes for queries
timelineSupplySchema.index({ timelineId: 1, status: 1 });
timelineSupplySchema.index({ warehouseId: 1, status: 1 });

const TimelineSupply = mongoose.model("TimelineSupply", timelineSupplySchema);

export default TimelineSupply;
