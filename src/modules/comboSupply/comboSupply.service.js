import { comboSupplyRepository } from "./comboSupply.repository.js";

class ComboSupplyService {
  async createComboSupply(data, user) {
    const payload = { ...data, createdBy: user.id };
    return await comboSupplyRepository.create(payload);
  }

  async getComboSupplies(query, user) {
    // Truyền role của user vào repository
    return await comboSupplyRepository.findAll(query, user.role);
  }

  async getComboSupplyById(id) {
    const comboSupply = await comboSupplyRepository.findById(id);
    if (!comboSupply) {
      const error = new Error("Combo Supply not found");
      error.statusCode = 404;
      throw error;
    }
    return comboSupply;
  }

  async updateComboSupply(id, data) {
    const updated = await comboSupplyRepository.update(id, data);
    if (!updated) {
      const error = new Error("Combo Supply not found");
      error.statusCode = 404;
      throw error;
    }
    return updated;
  }

  async deleteComboSupply(id) {
    const deleted = await comboSupplyRepository.delete(id);
    if (!deleted) {
      const error = new Error("Combo Supply not found");
      error.statusCode = 404;
      throw error;
    }
    return deleted;
  }
}

export const comboSupplyService = new ComboSupplyService();
