import mongoose from "mongoose";

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
      enum: [
        "ASSIGNED",
        "EN_ROUTE",
        "ON_SITE",
        "COMPLETED",
        "PARTIAL",
        "FAILED",
        "WITHDRAWN",
        "CANCELLED",
      ],
      default: "ASSIGNED",
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
    startedAt: Date,
    arrivedAt: Date,
    completedAt: Date,
    note: String,
  },
  {
    timestamps: true,
  },
);

const Timeline = mongoose.model("Timeline", timelineSchema);
export default Timeline;
