import mongoose from "mongoose";

const { Schema } = mongoose;

const teamRequestSupplySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    deliveredQty: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  { _id: false },
);

const teamRequestSchema = new Schema(
  {
    missionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mission",
      required: true,
      index: true,
    },
    missionRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MissionRequest",
      required: true,
      index: true,
    },
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
      index: true,
    },
    rescuedCountTotal: {
      type: Number,
      min: 0,
      default: 0,
    },
    suppliesDeliveredTotal: {
      type: [teamRequestSupplySchema],
      default: [],
    },
    lastUpdatedAt: {
      type: Date,
      default: null,
      index: true,
    },
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

teamRequestSchema.index({ missionRequestId: 1, teamId: 1 }, { unique: true });
teamRequestSchema.index({ teamId: 1, lastUpdatedAt: -1 });
teamRequestSchema.index({ missionId: 1, missionRequestId: 1 });

const TeamRequest = mongoose.model("TeamRequest", teamRequestSchema);

export default TeamRequest;
