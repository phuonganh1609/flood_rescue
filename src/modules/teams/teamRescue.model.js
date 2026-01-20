import mongoose from "mongoose";
const { Schema } = mongoose;

const RescueTeamSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["Active", "Offline", "Busy"],
    },
  },
  { timestamps: true },
);

export default mongoose.model("RescueTeam", RescueTeamSchema);
