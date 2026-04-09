import mongoose from "mongoose";

export const MISSION_REQUEST_STATUS = {
  PENDING: "PENDING",
  IN_PROGRESS: "IN_PROGRESS",
  PARTIAL: "PARTIAL",
  FULFILLED: "FULFILLED",
  CLOSED: "CLOSED",
  DROPPED: "DROPPED",
};

const missionRequestSchema = new mongoose.Schema(
  {
    missionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mission",
      required: true,
      index: true,
    },
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Request",
      required: true,
      index: true,
    },
    comboSupplyId: { type: mongoose.Schema.Types.ObjectId, ref: "ComboSupply", index: true },
    status: {
      type: String,
      enum: Object.values(MISSION_REQUEST_STATUS),
      default: MISSION_REQUEST_STATUS.PENDING,
    },
    peopleNeeded: {
      type: Number,
      min: 0,
      default: 0,
    },
    peopleRescued: {
      type: Number,
      min: 0,
      default: 0,
    },
    peopleRemaining: {
      type: Number,
      min: 0,
      default: 0,
    },
    requestSuppliesSnapshot: {
      type: Array,
      default: [],
    },
    suppliesDelivered: {
      type: Array,
      default: [],
    },
    fulfillmentPercent: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    handledByTeamIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Team",
      },
    ],
    lastUpdatedByTimelineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Timeline",
      default: null,
    },
    closedAt: {
      type: Date,
      default: null,
    },
    note: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

missionRequestSchema.index({ missionId: 1, requestId: 1 }, { unique: true });

const MissionRequest = mongoose.model("MissionRequest", missionRequestSchema);
export default MissionRequest;
