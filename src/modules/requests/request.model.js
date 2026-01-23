import mongoose from "mongoose";
const { Schema } = mongoose;

const RequestMissionSchema = new Schema(
  {
    userName: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      enum: ["Cứu trợ", "Cứu nạn"],
    },

    incidentType: {
      type: String,
      enum: ["Ngập lụt", "Bị Kẹt", "Bị Thương", "Sạt lở", "Khác"],
      default: "Khác",
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
    },

    peopleCount: {
      type: Number,
      default: 1,
    },
    
    priority: {
      type: String,
      enum: ["Báo Động", "Cao", "Bình thường"],
      default: "Bình thường",
    },

    status: {
      type: String,
      default: "Chờ xử lý",
    },

    requestSupply: {
      type: [String],
    },
    requestMedia: {
      type: String,
    },
  },
  { timestamps: true },
);

export default mongoose.model("RequestMission", RequestMissionSchema);
