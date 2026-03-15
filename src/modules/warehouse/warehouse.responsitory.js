import { Warehouse } from './warehouse.model.js';
import InventoryItem from '../inventory/inventoryItem.model.js';

class WarehouseRepository {
// Warehouse repository
  async create(warehouseData) {
   const warehouse = new Warehouse(warehouseData);
   return await warehouse.save();
  };

  async findByName(warehouseName) {
    return await Warehouse.findOne({ name: warehouseName }).lean();
  };

 async findAll(filter = {}, pagination = { page: 1, limit: 10 }) {
     const { page, limit } = pagination;
     const skip = (page - 1) * limit;
 
     const warehouse = await Warehouse.find(filter)
       .skip(skip)
       .limit(limit)
       .sort({ createdAt: -1 });
 
     const total = await Warehouse.countDocuments(filter);
 
     return {
       data: warehouse,
       total,
       page,
       limit,
       totalPages: Math.ceil(total / limit),
     };
   };

   async updateByName(name, payload) {
    return Warehouse.findOneAndUpdate({ name }, payload, { new: true }).lean();
  };

  async deleteByName(name) {
    return Warehouse.findOneAndDelete({ name }).lean();
  };

async getInventoryById(inventoryId) {
  return InventoryItem.findById(inventoryId)
    .populate('supplyID')
    .populate('warehouse')
    .lean();
};
}
const warehouseRepository = new WarehouseRepository();
export { warehouseRepository };