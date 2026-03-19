import { InventoryItem } from './inventoryItem.model.js';
import Supply from '../supply/supply.model.js';
import { Warehouse } from '../warehouse/warehouse.model.js';
import Vehicle from '../vehicles/vehicle.model.js';
import mongoose from 'mongoose';

class InventoryItemRepository {

  async insertMany(inventoryItems) {
      return await InventoryItem.insertMany(inventoryItems);
    }

  async create (inventoryData){
    const doc = new InventoryItem(inventoryData);
    return doc.save();
  };

   // Tìm nhiều supply theo mảng tên → trả về map name → _id
  async findSuppliesByNames(names) {
    const supplies = await Supply.find({ 
      name: { $in: names } 
    }).select("_id name").lean();
    return new Map(supplies.map(s => [s.name, s._id]));
  }

   async findWarehousesByNames(names) {
    const warehouses = await Warehouse.find({ 
      name: { $in: names } 
    }).select('_id name').lean();
    return new Map(warehouses.map(w => [w.name, w._id]));
  }

  //  Thêm method mới cho vehicle
  async findVehiclesByPlates(plates) {
    const vehicles = await Vehicle.find({
      licensePlate: { $in: plates }
    }).select('_id licensePlate').lean();
    return new Map(vehicles.map(v => [v.licensePlate, v._id]));
  }

  async findAll(filter = {}, pagination = { page: 1, limit: 10 }) {
  const { page, limit } = pagination;
  const skip = (page - 1) * limit;

  const inventoryItems = await InventoryItem.find(filter)
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 })
    .populate('supplyID')
    .populate('vehicleID') 
    .populate('warehouse');

  const total = await InventoryItem.countDocuments(filter);

  // 🔥 CHÈN Ở ĐÂY
  const transformedData = inventoryItems.map(item => {
    const obj = item.toObject(); // 👈 nên dùng cái này thay vì _doc

    if (obj.itemType === "VEHICLE") {
      return {
        ...obj,
        status: obj.vehicleID?.status // 👉 lấy từ vehicle
      };
    }

    return obj;
  });

  return {
    data: transformedData, // ✅ dùng data đã transform
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
    async updateById(id, payload) {
      return await InventoryItem.findByIdAndUpdate(id, payload, { new: true }).lean();
    }

    // Backward-compatible alias kept for existing tests/callers.
    async updateByName(name, payload) {
      return await this.updateById(name, payload);
    }

    async deleteById(id) {
      return await InventoryItem.findByIdAndDelete(id).lean();
    }

    // Backward-compatible alias kept for existing tests/callers.
    async deleteByName(name) {
      return await this.deleteById(name);
    }

    async findBySupplyAndWarehouse(supplyID, warehouseId) {
      const item = await InventoryItem.findOne({
        supplyID: new mongoose.Types.ObjectId(supplyID),
        warehouse: new mongoose.Types.ObjectId(warehouseId),
      });
    console.log("FOUND ITEM:", item);
    return item;
  }

    async updateInventory(id, updateData) {
      return await InventoryItem.findByIdAndUpdate(id, updateData, {
      new: true,
      });
    }

    async findVehicleItem(vehicleId, session = null) {
    return await InventoryItem.findOne({
      vehicleID: vehicleId
    }).session(session);
  }

  async updateStatus(id, status, session = null) {
    return await InventoryItem.findByIdAndUpdate(
      id,
      { status },
      { new: true, session }
    );
  }

}


const inventoryItemRepository = new InventoryItemRepository();
export { inventoryItemRepository };