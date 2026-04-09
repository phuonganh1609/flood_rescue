import mongoose from "mongoose";

const timelineVehicleSchema = new mongoose.Schema(
  {
    timelineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Timeline",
      required: true,
      index: true,
    },
    missionVehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MissionVehicle",
      required: true,
      index: true,
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
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

// Unique constraint: A team timeline should only have one record per missionVehicle source
timelineVehicleSchema.index({ timelineId: 1, missionVehicleId: 1 }, { unique: true });

const TimelineVehicle = mongoose.model("TimelineVehicle", timelineVehicleSchema);

export default TimelineVehicle;
