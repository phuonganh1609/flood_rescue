import mongoose from "mongoose";

const teamMemberSchema = new mongoose.Schema(
  {
    userName: {
      type: String,
      required: true,
    },
    rescueTeamName: {
      type: String,
      required: true,
    },
    roleInTeam: {
      type: String,
      enum: ["Leader", "Member", "Driver", "Medic"],
      default: "Member",
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("TeamMember", teamMemberSchema);
