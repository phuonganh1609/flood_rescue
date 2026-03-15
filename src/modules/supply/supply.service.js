import { eventBus } from "../../utils/events.js";
import { supplyRepository } from "./supply.repository.js";
import XLSX from "xlsx";
import { normalizeText } from '../../utils/normalizeName.js';
class SupplyService {

async importExcel(supplies, managerId) {

  const formattedSupplies = supplies.map((row) => ({
    name: row.name,
    nameNormalized: normalizeText(row.name), // ✅ lưu tên không dấu
    category: row.category|| "OTHER",
    unit: row.unit,
    unitWeight: Number(row.unitWeight),
    description: row.description || "Imported from Excel",
    status: row.status || "SUBMITTED",
    isActive: row.isActive ?? true,
    createdBy: managerId,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  const result = await supplyRepository.insertMany(formattedSupplies);

  return result;
}
    async createSupply(supplyData, managerId) {
        const{ 
            name, 
            category, 
            unit, 
            unitWeight, 
            description,
            isActive = true,
        } = supplyData;
        if (!name || !category || !unit) {
        throw new Error("Name, category and unit are required");
    }

    const existing = await supplyRepository.findByName(name);
    if (existing) {
        throw new Error(`Supply "${name}" already exists`);
    }

    const newSupply = await supplyRepository.createSupply({
        name,
        nameNormalized: normalizeText(name), // ✅ lưu tên không dấu
        category,
        unit,
        unitWeight,
        description,
        isActive,
        createdBy: managerId,
    });
        eventBus.emit("SUPPLY_CREATED", {
            supplyId: newSupply._id,
            userId: managerId,
        });

        return {
            message: "Supply created successfully",
            data: newSupply,
        };
    }

    // ─── Read ───────────────────────────────────────────────
    
    async getSupplyByName(name) {
        return await supplyRepository.findSupplyByName(name);
    }

    async getSupplyById(supplyId) {
        return await supplyRepository.findSupplyById(supplyId);
    }

    async getAllSupplies(filter = {}, pagination = { page: 1, limit: 10 }) {
        return await supplyRepository.findAllSupplies(filter, pagination);
    }
    
    async getAllSuppliesByCategory(filter = {}, pagination = { page: 1, limit: 10 }) {
        const findByCategory =
            supplyRepository.findAllSuppliesByCategory ||
            supplyRepository.findAllSuppliesCategory;

        return await findByCategory.call(supplyRepository, filter, pagination);
    }

    async getSupplyByRequestStatus(status) {
        return await supplyRepository.getSuppliesByRequestStatus(status);
    }

    // ─── Update ─────────────────────────────────────────────

    async updateSupply(supplyId, updateData, managerId) {
        const updatedSupply = await supplyRepository.updateSupply(supplyId, {
            ...updateData,
            updatedAt: new Date(),
        });

        if (!updatedSupply) {
            throw new Error("Supply not found");
        }

        eventBus.emit("SUPPLY_UPDATED", {
            supplyId: updatedSupply._id,
            userId: managerId,
        });

        return {
            message: "Supply updated successfully",
            data: updatedSupply,
        };
    }

    // ─── Delete ─────────────────────────────────────────────

    async deleteSupply(supplyId, managerId) {
        const deletedSupply = await supplyRepository.deleteSupply(supplyId);

        if (!deletedSupply) {
            throw new Error("Supply not found");
        }

        eventBus.emit("SUPPLY_DELETED", {
            supplyId: deletedSupply._id,
            userId: managerId,
        });

        return {
            message: "Supply deleted successfully",
            data: deletedSupply,
        };
    }
}
const supplyService = new SupplyService();
export {supplyService };