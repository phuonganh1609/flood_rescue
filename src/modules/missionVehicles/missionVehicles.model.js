import mongoose from "mongoose";

const missionVehicleSchema = new mongoose.Schema(
  {
    missionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mission",
      required: true
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User" // rescue team / leader
    },
    status: {
      type: String,
      enum: ["ASSIGNED", "IN_PROGRESS", "DONE", "CANCELLED"],
      default: "ASSIGNED"
    },
    startTime: Date,
    endTime: Date
  },
  { timestamps: true }
);

// tránh 1 xe bị assign 2 mission cùng lúc
missionVehicleSchema.index(
  { vehicleId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ["ASSIGNED", "IN_PROGRESS"] } } }
);

export default mongoose.model("MissionVehicle", missionVehicleSchema);