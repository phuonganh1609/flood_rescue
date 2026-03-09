import {mongoose} from 'mongoose';
import { Schema } from 'mongoose';

export const WAREHOUSE_STATUS = {
    FULL: "FULL",
    EMPTY: "EMPTY",
    MAINTENANCE: "MAINTENANCE",
};

const warehouseSchema = new Schema({
    name: {
        type: String,
        unique: true,
        required: true
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
        default: "Point",
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },
    status: {
        type: String,
        enum: Object.values(WAREHOUSE_STATUS),
        default: WAREHOUSE_STATUS.EMPTY,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

export const Warehouse = mongoose.model('Warehouse', warehouseSchema);
