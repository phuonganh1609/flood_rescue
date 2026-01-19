const mongoose = require("mongoose");
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

module.exports = mongoose.model("RescueTeam", RescueTeamSchema);
