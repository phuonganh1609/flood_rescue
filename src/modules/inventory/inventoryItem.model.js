import mongoose from 'mongoose';
const { Schema } = mongoose;

export const INVENTORY_ITEM_STATUS = {
  ACTIVE: 'ACTIVE',
  OUT_OF_STOCK: 'OUT_OF_STOCK',
  RESERVED: 'RESERVED',
};

const inventoryItemSchema = new Schema(
  {
    supplyID: { type: Schema.Types.ObjectId, ref: 'Supply', required: true },
    description: { type: String },
    quantity: { type: Number, default: 0 },
    reservedQuantity: { type: Number, default: 0 },
    unit: { type: String },
    warehouse: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    status: { type: String, enum: Object.values(INVENTORY_ITEM_STATUS), default: INVENTORY_ITEM_STATUS.ACTIVE },
    lastUpdated: { type: Date, default: Date.now },
},
  { timestamps: true },
);

export const InventoryItem = mongoose.model('InventoryItem', inventoryItemSchema);
