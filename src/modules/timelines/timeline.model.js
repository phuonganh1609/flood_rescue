import mongoose from "mongoose";

export const TIMELINE_STATUS = {
  ASSIGNED: "ASSIGNED",
  EN_ROUTE: "EN_ROUTE",
  ON_SITE: "ON_SITE",
  COMPLETED: "COMPLETED",
  PARTIAL: "PARTIAL",
  FAILED: "FAILED",
  WITHDRAWN: "WITHDRAWN",
  CANCELLED: "CANCELLED",
};

const timelineSchema = new mongoose.Schema(
  {
    missionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mission",
      required: true,
    },
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Request",
      required: true,
    },
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(TIMELINE_STATUS),
      default: TIMELINE_STATUS.ASSIGNED,
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
    startedAt: Date,
    arrivedAt: Date,
    completedAt: Date,
    rescuedCount: {
      type: Number,
      min: 0,
      default: 0,
    },
    failureReason: String,
    withdrawalReason: String,
    note: String,
  },
  {
    timestamps: true,
  },
);

const Timeline = mongoose.model("Timeline", timelineSchema);
export default Timeline;
