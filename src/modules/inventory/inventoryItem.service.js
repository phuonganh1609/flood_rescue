import { inventoryItemRepository } from './inventoryItem.repository.js';
import { Warehouse } from '../warehouse/warehouse.model.js';
import Supply from '../supply/supply.model.js';
import {eventBus} from '../../utils/events.js';
import XLSX from "xlsx";
class InventoryItemService {

//    async importExcel(supplies, managerId) {

//   const supplyNames    = [...new Set(supplies.map(r => r.supplyName))];
//   const warehouseNames = [...new Set(supplies.map(r => r.warehouse))];

//   // Dùng method mới từ inventoryItemRepository
//   const [supplyMap, warehouseMap] = await Promise.all([
//     inventoryItemRepository.findSuppliesByNames(supplyNames),
//     inventoryItemRepository.findWarehousesByNames(warehouseNames),
//   ]);

//   const errors = [];
//   const formattedSupplies = [];

//   supplies.forEach((row, index) => {
//     const supplyId    = supplyMap.get(row.supplyName);
//     const warehouseId = warehouseMap.get(row.warehouse);

//     if (!supplyId) {
//       errors.push(`Row ${index + 2}: Supply "${row.supplyName}" not found`);
//       return;
//     }
//     if (!warehouseId) {
//       errors.push(`Row ${index + 2}: Warehouse "${row.warehouse}" not found`);
//       return;
//     }

//     formattedSupplies.push({
//       supplyID:         supplyId,    // đúng tên field trong model
//       warehouse:        warehouseId, // đúng tên field trong model
//       description:      row.description,
//       quantity:         Number(row.quantity)         || 0,
//       reservedQuantity: Number(row.reservedQuantity) || 0,
//       unit:             row.unit,
//       status:           row.status  || "ACTIVE",
//       createdBy:        managerId,
//     });
//   });

//   if (errors.length > 0) {
//     throw new Error(errors.join("\n"));
//   }

//   const result = await inventoryItemRepository.insertMany(formattedSupplies);

//   return {
//     inserted: result.length,
//     data: result,
//   };
// }

async importExcel(inventories, managerId) {
  // ===== 1. Tách dữ liệu =====
  const supplyRows = inventories.filter(r => r.itemType === "SUPPLY");
  const vehicleRows = inventories.filter(r => r.itemType === "VEHICLE");

  const supplyNames = [...new Set(supplyRows.map(r => r.supplyName))];
  const vehicleLicenses = [...new Set(vehicleRows.map(r => r.licensePlate))];
  const warehouseNames = [...new Set(inventories.map(r => r.warehouse))];

  // ===== 2. Query DB =====
  const [supplyMap, warehouseMap, vehicleMap] = await Promise.all([
    supplyNames.length > 0
      ? inventoryItemRepository.findSuppliesByNames(supplyNames)
      : Promise.resolve(new Map()),

    inventoryItemRepository.findWarehousesByNames(warehouseNames),

    vehicleLicenses.length > 0
      ? inventoryItemRepository.findVehiclesByPlates(vehicleLicenses)
      : Promise.resolve(new Map()),
  ]);

  // ===== 3. Validate + format =====
  const errors = [];
  const formatted = [];

  inventories.forEach((row, index) => {
    const rowNumber = index + 2;

    const warehouseId = warehouseMap.get(row.warehouse);
    if (!warehouseId) {
      errors.push(`Row ${rowNumber}: Warehouse "${row.warehouse}" not found`);
      return;
    }

    if (row.itemType === "SUPPLY") {
      const supplyId = supplyMap.get(row.supplyName);

      if (!supplyId) {
        errors.push(`Row ${rowNumber}: Supply "${row.supplyName}" not found`);
        return;
      }

      formatted.push({
        itemType: "SUPPLY",
        supplyID: supplyId,
        warehouse: warehouseId,
        description: row.description || "",
        quantity: Number(row.quantity) || 0,
        reservedQuantity: Number(row.reservedQuantity) || 0,
        unit: row.unit || "",
        status: row.status || "ACTIVE",
        createdBy: managerId,
      });
    }

    if (row.itemType === "VEHICLE") {
      const vehicleId = vehicleMap.get(row.licensePlate);

      if (!vehicleId) {
        errors.push(`Row ${rowNumber}: Vehicle "${row.licensePlate}" not found`);
        return;
      }

      formatted.push({
        itemType: "VEHICLE",
        vehicleID: vehicleId,
        warehouse: warehouseId,
        description: row.description || "",
        createdBy: managerId,
      });
    }
  });

  // ===== 4. Check lỗi =====
  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }

  // ===== 5. Check dữ liệu hợp lệ =====
  if (formatted.length === 0) {
    throw new Error("No valid data to import");
  }

  // ===== 6. Insert DB =====
  const insertedDocs = await inventoryItemRepository.insertMany(formatted);

  // ===== 7. Return chuẩn =====
  return {
    inserted: insertedDocs.length,
    data: insertedDocs,
  };
}
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