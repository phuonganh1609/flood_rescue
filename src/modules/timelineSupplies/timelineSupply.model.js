import mongoose from "mongoose";

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
      required: true,
      index: true,
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
  },
  { timestamps: true },
);

// Unique constraint: A team timeline should only have one record per missionSupply source
timelineSupplySchema.index({ timelineId: 1, missionSupplyId: 1 }, { unique: true });

const TimelineSupply = mongoose.model("TimelineSupply", timelineSupplySchema);

export default TimelineSupply;
