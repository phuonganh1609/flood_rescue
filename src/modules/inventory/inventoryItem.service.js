import { inventoryItemRepository } from './inventoryItem.repository.js';
import { Warehouse } from '../warehouse/warehouse.model.js';
import Supply from '../supply/supply.model.js';
import { eventBus } from '../../utils/events.js';


class InventoryItemService {
 async create (inventoryData, managerID){
        const{ 
            supplyID ,
            description,
            quantity,
            reservedQuantity,
            unit,
            warehouse,
            status = inventoryData.status || "ACTIVE",
        } = inventoryData;
       
        // ensure referenced documents exist
        if (warehouse) {
            const wh = await Warehouse.findById(warehouse).lean();
            if (!wh) throw new Error('Warehouse not found');
        }
        if (supplyID) {
            const supply = await Supply.findById(supplyID).lean();
            if (!supply) throw new Error('Supply not found');
        }

        let newInventoryItem = await inventoryItemRepository.create({
            supplyID,
            description,
            quantity,
            reservedQuantity,
            unit,
            warehouse,
            status: inventoryData.status || "ACTIVE",
            createdBy: managerID,
        });

        // populate references before returning so the client gets full objects
        newInventoryItem = await newInventoryItem.populate(['supplyID', 'warehouse']);

        eventBus.emit("INVENTORY_ITEM_CREATED", {
            inventoryItemId: newInventoryItem._id,
            userId: managerID,
        });

        return {
            message: "Inventory item created successfully",
            data: newInventoryItem,
        };
    };

    async getByName(supplyName) {
        // repository already populates the supply and warehouse
        return await inventoryItemRepository.findByName(supplyName);
    };

    async getById(id) {
        return await inventoryItemRepository.findById(id);
    };

    
    async list(filter = {}, pagination = { page: 1, limit: 10 }) {
        if (filter.supplyName) {
            const supplies = await Supply.find({
                name: { $regex: filter.supplyName, $options: 'i' },
            }).select('_id');

            filter.supplyID = { $in: supplies.map((s) => s._id) };
            delete filter.supplyName;
        }

        // repository already populates the supply and warehouse
        return await inventoryItemRepository.findAll(filter, pagination);
    };

    async update(id, payload) {
        const updater = inventoryItemRepository.updateById || inventoryItemRepository.updateByName;
        const updatedInventoryItem = await updater.call(inventoryItemRepository, id, payload);
        if (updatedInventoryItem) {
            eventBus.emit("INVENTORY_ITEM_UPDATED", {
                inventoryItemId: updatedInventoryItem._id,
                updatedFields: payload,
            });
        } else {
            throw new Error("Inventory item not found");
        }
        return updatedInventoryItem;
    };

    async remove(id) {
        const deleter = inventoryItemRepository.deleteById || inventoryItemRepository.deleteByName;
        const deletedInventoryItem = await deleter.call(inventoryItemRepository, id);
        if (deletedInventoryItem) {
            eventBus.emit("INVENTORY_ITEM_DELETED", {
                inventoryItemId: deletedInventoryItem._id,
            });
        }
        return deletedInventoryItem;
    };

    
}
const inventoryItemService = new InventoryItemService();
export{ inventoryItemService };


// const list = async (filter, options) => inventoryResponsitory.findAll(filter, options);

// const update = async (id, payload) => {
//   if (payload.warehouse) {
//     const wh = await Warehouse.findById(payload.warehouse).lean();
//     if (!wh) throw new Error('Warehouse not found');
//   }
//   if (payload.supplyID) {
//     const supply = await Supply.findById(payload.supplyID).lean();
//     if (!supply) throw new Error('Supply not found');
//   }
//   return repository.updateById(id, payload);
// };
// const remove = async (id) => repository.deleteById(id);

// export default {
//   create,
//   getById,
//   list,
//   update,
//   remove,
// };
