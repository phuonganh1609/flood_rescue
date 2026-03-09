import { authRepository } from "../auth/auth.repository.js";
import { eventBus } from "../../utils/events.js";
import Supply from "./supply.model.js";
import { supplyRepository } from "./supply.repository.js";

class SupplyService {
    async createSupply(supplyData, managerId) {
        const{ 
            name, 
            category, 
            unit, 
            unitWeight, 
            description,
            isActive = true,
        } = supplyData;
       
        const newSupply = await supplyRepository.createSupply({
            name,
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
        return await supplyRepository.findAllSuppliesCategory(filter, pagination);
    }

    async getSupplyByRequestType(type) {
        return await supplyRepository.getSuppliesByRequestType(type);
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