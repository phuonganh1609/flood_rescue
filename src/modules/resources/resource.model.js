import mongoose from 'mongoose';

const { Schema } = mongoose;

export const RESOURCE_STATUS = {
  AVAILABLE: 'AVAILABLE',
  ALLOCATED: 'ALLOCATED',
  IN_USE: 'IN_USE',
  DEPLETED: 'DEPLETED',
};

export const RESOURCE_TYPE = {
  FOOD: 'FOOD',
  WATER: 'WATER',
  MEDICAL: 'MEDICAL',
  SHELTER: 'SHELTER',
  EQUIPMENT: 'EQUIPMENT',
  FUEL: 'FUEL',
  OTHER: 'OTHER',
};

const resourceSchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    type: { type: String, enum: Object.values(RESOURCE_TYPE), required: true },
    description: { type: String },
    quantity: { type: Number, default: 0, min: 0 },
    unit: { type: String, required: true },
    status: { type: String, enum: Object.values(RESOURCE_STATUS), default: RESOURCE_STATUS.AVAILABLE },
    location: { type: String },
    allocatedTo: [{ type: Schema.Types.ObjectId, ref: 'Team' }],
    expiryDate: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const Resource = mongoose.model('Resource', resourceSchema);
