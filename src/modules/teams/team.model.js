import mongoose from "mongoose";
const { Schema } = mongoose;

/**
 * Team status enum
 */
export const TEAM_STATUS = {
  AVAILABLE: "AVAILABLE",
  BUSY: "BUSY",
};

const teamSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    leaderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    status: {
      type: String,
      enum: Object.values(TEAM_STATUS),
      default: TEAM_STATUS.AVAILABLE,
    },
  },
  { timestamps: true },
);

const Team = mongoose.model("Team", teamSchema);

export default Team;
