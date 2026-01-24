import mongoose from "mongoose";
const { Schema } = mongoose;

// Schema for request media files
const MediaSchema = new Schema(
  {
    imageUrl: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const RequestMissionSchema = new Schema(
  {
    userName: {
      type: String,
      required: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      enum: ["Rescue", "Relief"],
      required: true,
    },

    incidentType: {
      type: String,
      enum: ["Flood", "Trapped", "Injured", "Landslide", "Other"],
      default: "Other",
    },

    latitude: {
      type: mongoose.Decimal128,
      required: true,
    },

    longitude: {
      type: mongoose.Decimal128,
      required: true,
    },

    description: {
      type: String,
      required: true,
    },

    peopleCount: {
      type: Number,
      min: 1,
      max: 100,
      default: 1,
    },

    priority: {
      type: String,
      enum: ["Critical", "High", "Normal"],
      default: "Normal",
    },

    status: {
      type: String,
      enum: ["Pending", "In Progress", "Completed", "Cancelled"],
      default: "Pending",
    },

    requestSupply: {
      type: [String],
      default: [],
    },

    requestMedia: {
      type: [MediaSchema],
      default: [],
    },
  },
  { timestamps: true },
);

export default mongoose.model("RequestMission", RequestMissionSchema);
