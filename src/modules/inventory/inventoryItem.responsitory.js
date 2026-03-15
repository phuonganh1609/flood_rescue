import { updateSupplySchema } from '../supply/supply.validation.js';
import { InventoryItem } from './inventoryItem.model.js';
import Supply from '../supply/supply.model.js';

class InventoryItemRepository {

  async insertMany(inventoryItems) {
      return await InventoryItem.insertMany(inventoryItems);
    }

  async create (inventoryData){
    const doc = new InventoryItem(inventoryData);
    return doc.save();
  };

  async findByName(supplyName) {
  // Tìm Supply trước
  const supply = await Supply.findOne({ name: supplyName });
  if (!supply) return null;
  // Tìm InventoryItem theo supplyID
  return await InventoryItem.findOne({ supplyID: supply._id })
    .populate('supplyID')
    .populate('warehouse')
    .lean();
}

  async findAll(filter = {}, pagination = { page: 1, limit: 10 }) {
       const { page, limit } = pagination;
       const skip = (page - 1) * limit;
   
       const inventoryItems = await InventoryItem.find(filter)
         .skip(skip)
         .limit(limit)
         .sort({ createdAt: -1 })
         .populate('supplyID')
         .populate('warehouse');
   
       const total = await InventoryItem.countDocuments(filter);
   
       return {
         data: inventoryItems,
         total,
         page,
         limit,
         totalPages: Math.ceil(total / limit),
       };
     };

    async updateById(id, payload) {
        return await InventoryItem.findByIdAndUpdate(id, payload, { new: true }).lean();
    };

    async deleteById(id) {
        return await InventoryItem.findByIdAndDelete(id).lean();
     };
}


const inventoryItemRepository = new InventoryItemRepository();
export { inventoryItemRepository };