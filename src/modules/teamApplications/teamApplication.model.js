import mongoose from "mongoose";

const { Schema } = mongoose;

export const TEAM_APPLICATION_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  WITHDRAWN: "WITHDRAWN",
};

const teamApplicationSchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    motivation: {
      type: String,
      required: true,
      trim: true,
    },
    submittedPhoneNumber: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(TEAM_APPLICATION_STATUS),
      default: TEAM_APPLICATION_STATUS.PENDING,
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: null,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

teamApplicationSchema.index(
  { userId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: TEAM_APPLICATION_STATUS.PENDING },
  },
);

const TeamApplication = mongoose.model("TeamApplication", teamApplicationSchema);

export default TeamApplication;
