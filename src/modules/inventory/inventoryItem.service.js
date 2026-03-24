import { inventoryItemRepository } from './inventoryItem.repository.js';
import { Warehouse } from '../warehouse/warehouse.model.js';
import Supply from '../supply/supply.model.js';
import {eventBus} from '../../utils/events.js';
import { InventoryItem } from "../inventory/inventoryItem.model.js";
import MissionSupply from "../missionSupplies/missionSupply.model.js";
import mongoose from 'mongoose';
import XLSX from "xlsx";
class InventoryItemService {

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

  async useSupplyFromInventory(supplyID, warehouseId, quantity) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const item = await inventoryItemRepository.findBySupplyAndWarehouse(
      supplyID,
      warehouseId,
      session
    );

    if (!item) throw new Error("Inventory not found");

    const available = item.quantity - item.reservedQuantity;

    if (available < quantity) {
      throw new Error("Not enough stock");
    }

    item.quantity -= quantity;

    const newAvailable = item.quantity - item.reservedQuantity;

    if (newAvailable === 0) item.status = "OUT_OF_STOCK";
    else if (item.reservedQuantity > 0) item.status = "RESERVED";
    else item.status = "ACTIVE";

    await item.save({ session });

    await session.commitTransaction();
    session.endSession();

    return item;

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
}

  async allocateSupplyToMission(missionId, supplyId, warehouseId, allocatedQty, managerId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Find the MissionSupply requirement
      const missionSupply = await MissionSupply.findOne({ missionId, supplyId }).session(session);
      if (!missionSupply) throw new Error("Mission Supply requirement not found (it might not have been requested for this mission)");
      if (missionSupply.status === "RETURNED") throw new Error("Mission supply order already returned");
      if (missionSupply.status === "ALLOCATED" || missionSupply.status === "FULLY_CLAIMED") throw new Error("Supply already allocated for this mission. Please create a new request if more needed.");
      if (allocatedQty <= 0) throw new Error("Allocated quantity must be greater than zero");

      // 2. Find the inventory item in the specified warehouse
      const inventoryItem = await inventoryItemRepository.findBySupplyAndWarehouse(supplyId, warehouseId, session);
      if (!inventoryItem) throw new Error("Supply not found in the selected warehouse");

      // 3. Ensure enough available quantity (unreserved)
      const availableQty = inventoryItem.quantity - inventoryItem.reservedQuantity;
      if (availableQty < allocatedQty) throw new Error(`Not enough available stock in this warehouse. Available: ${availableQty}`);

      // 4. Update Mission Supply Allocation
      missionSupply.warehouseId = warehouseId;
      missionSupply.inventoryItemId = inventoryItem._id;
      missionSupply.allocatedQty = allocatedQty;
      missionSupply.status = "ALLOCATED";
      missionSupply.allocatedBy = managerId;
      missionSupply.allocatedAt = new Date();
      await missionSupply.save({ session });

      // 5. Update Inventory Item Reserved Quantity
      inventoryItem.reservedQuantity += allocatedQty;
      inventoryItem.status = "RESERVED"; 
      await inventoryItem.save({ session });

      await session.commitTransaction();
      session.endSession();

      return missionSupply;
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  }
}
const inventoryItemService = new InventoryItemService();
export{ inventoryItemService };