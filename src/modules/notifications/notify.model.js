import mongoose from "mongoose";
const { Schema } = mongoose;

const NotifySchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        "SUBMITTED",
        "ACCEPTED",
        "REJECTED",
        "ONGOING",
        "IN_PROGRESS",
        "COMPLETED",
        "CANCELLED",
        "WITHDRAWN",
      ],
    },
    role: {
      type: String,
      required: true,
      enum: [
        "CITIZEN",
        "COORDINATOR",
        "TEAM_LEADER",
        "TEAM_MEMBER",
        "ADMIN",
        "MANAGER",
      ],
    },
    message: {
      type: String,
      required: true,
    },
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Request",
      required: false,
    },
    missionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mission",
      required: false,
    },
    teamApplicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TeamApplication",
      required: false,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

export default mongoose.model("Notification", NotifySchema);
