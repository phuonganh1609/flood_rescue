import { inventoryItemRepository } from './inventoryItem.repository.js';
import { Warehouse } from '../warehouse/warehouse.model.js';
import Supply from '../supply/supply.model.js';
import {eventBus} from '../../utils/events.js';
import XLSX from "xlsx";
class InventoryItemService {

    async importExcel(supplies, managerId) {
    
      const formattedSupplies = supplies.map((row) => ({
        name: row.supplyName,
        warehouse: row.warehouse,
        quantity: Number(row.quantity),
        reservedQuantity: Number(row.reservedQuantity),
        unit: row.unit,
        status: row.status || "ACTIVE",
        createdBy: managerId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
    
      const result = await inventoryItemRepository.insertMany(formattedSupplies);
    
      return result;
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
async importExcel(rows, managerId) {

  if (!rows || rows.length === 0) {
    throw new Error("Excel file is empty");
  }

  const normalize = (s) => s?.trim().toLowerCase();

  // lấy danh sách warehouse và supply
  const warehouseNames = [...new Set(
    rows.map(r => normalize(r.warehouse)).filter(Boolean)
  )];

  const supplyNames = [...new Set(
    rows.map(r => normalize(r.supplyName)).filter(Boolean)
  )];

  // query DB
  const warehouses = await Warehouse.find().lean();
  const supplies = await Supply.find().lean();

  // map name -> id
  const warehouseMap = {};
  warehouses.forEach(w => {
    warehouseMap[normalize(w.name)] = w._id;
  });

  const supplyMap = {};
  supplies.forEach(s => {
    supplyMap[normalize(s.name)] = s._id;
  });

  const formattedSupplies = [];

  for (let i = 0; i < rows.length; i++) {

    const row = rows[i];
    const line = i + 2;

    const supplyName = normalize(row.supplyName);
    const warehouseName = normalize(row.warehouse);

    if (!supplyName) {
      throw new Error(`Row ${line}: supplyName is required`);
    }

    if (!warehouseName) {
      throw new Error(`Row ${line}: warehouse is required`);
    }

    const supplyId = supplyMap[supplyName];
    if (!supplyId) {
      throw new Error(`Row ${line}: Supply "${row.supplyName}" not found`);
    }

    const warehouseId = warehouseMap[warehouseName];
    if (!warehouseId) {
      throw new Error(`Row ${line}: Warehouse "${row.warehouse}" not found`);
    }

    formattedSupplies.push({
      supplyID: supplyId,
      quantity: Number(row.quantity) || 0,
      reservedQuantity: Number(row.reservedQuantity) || 0,
      unit: row.unit?.trim() || "",
      warehouse: warehouseId,
      status: row.status || "ACTIVE",
      createdBy: managerId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

  }

  const result = await inventoryItemRepository.insertMany(formattedSupplies);

  eventBus.emit("INVENTORY_IMPORTED", {
    count: result.length,
    userId: managerId,
  });

  return {
    message: "Import Excel successfully",
    inserted: result.length,
  };
}
    
}
const inventoryItemService = new InventoryItemService();
export{ inventoryItemService };