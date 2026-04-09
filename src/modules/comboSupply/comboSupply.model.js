import mongoose from "mongoose";
const { Schema } = mongoose;

const ComboSupplySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    // Thay đổi từ incidentType sang type
    type: {
      type: String,
      enum: ["Citizen", "Rescue Team"],
      required: true,
    },
    // Thêm phân loại cụ thể (Người lớn, trẻ em, bị thương...)
    category: {
      type: String,
      enum: ["Adult", "Child", "Elderly", "Injured", "Specialized", "Other"],
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    supplies: [
      {
        supplyId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Supply",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export default mongoose.model("ComboSupply", ComboSupplySchema);