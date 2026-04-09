import mongoose from "mongoose";

export const TIMELINE_VEHICLE_STATUS = {
  RESERVED: "RESERVED",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  CLAIMED: "CLAIMED",
  RETURNED: "RETURNED",
};

const timelineVehicleSchema = new mongoose.Schema(
  {
    timelineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Timeline",
      required: true,
      index: true,
    },

    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
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
    status: {
      type: String,
      enum: Object.values(TIMELINE_VEHICLE_STATUS),
      default: TIMELINE_VEHICLE_STATUS.RESERVED,
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
  },
  { timestamps: true }
);

// Composite indexes for queries
timelineVehicleSchema.index({ timelineId: 1, status: 1 });
timelineVehicleSchema.index({ vehicleId: 1, status: 1 });

const TimelineVehicle = mongoose.model("TimelineVehicle", timelineVehicleSchema);

export default TimelineVehicle;
