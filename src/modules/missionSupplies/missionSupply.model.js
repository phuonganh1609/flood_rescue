import mongoose from "mongoose";

export const MISSION_SUPPLY_STATUS = {
  REQUESTED: "REQUESTED",
  ALLOCATED: "ALLOCATED",
  FULLY_CLAIMED: "FULLY_CLAIMED",
  RETURNED: "RETURNED",
};

const missionSupplySchema = new mongoose.Schema(
  {
    missionId: { type: mongoose.Schema.Types.ObjectId, ref: "Mission", required: false, index: true },
    supplyId: { type: mongoose.Schema.Types.ObjectId, ref: "Supply", required: true, index: true },
    requestId: { type: mongoose.Schema.Types.ObjectId, ref: "Request", index: true }, // Link tới Request gốc
    warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse", default: null },
    
    // Đổi tên từ plannedQty thành requestedQty để khớp với code tạo của bạn
    requestedQty: { type: Number, required: true, min: 0, default: 0 },
    
    allocatedQty: { type: Number, min: 0, default: 0 },
    claimedQty: { type: Number, min: 0, default: 0 },
    status: {
      type: String,
      enum: Object.values(MISSION_SUPPLY_STATUS),
      default: MISSION_SUPPLY_STATUS.REQUESTED,
    },
    allocatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    allocatedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

// Bỏ Unique {missionId, supplyId} nếu bạn muốn 1 Mission có thể nhận cùng 1 loại vật tư từ nhiều Request khác nhau
const MissionSupply = mongoose.model("MissionSupply", missionSupplySchema);
export default MissionSupply;