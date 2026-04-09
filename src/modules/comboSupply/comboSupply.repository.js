import ComboSupply from "./comboSupply.model.js";

class ComboSupplyRepository {
  async create(data) {
    return await ComboSupply.create(data);
  }

  async findById(id) {
    return await ComboSupply.findById(id).populate("supplies.supplyId");
  }

  async findAll(query = {}, userRole = null) {
    const filters = {};

    // 1. Logic lọc theo Role
    if (userRole === 'Citizen') {
      filters.type = 'Citizen';
    } else if (userRole === 'Rescue Team') {
      filters.type = 'Rescue Team';
    } else {
      // Admin, Manager, Coordinator có thể xem theo query truyền lên hoặc xem tất cả
      if (query.type) filters.type = query.type;
    }

    // Các filter khác giữ nguyên
    if (query.category) filters.category = query.category;
    if (query.isActive !== undefined) filters.isActive = query.isActive;

    const limit = query.limit ? parseInt(query.limit) : 20;
    const page = query.page ? parseInt(query.page) : 1;
    const skip = (page - 1) * limit;

    const data = await ComboSupply.find(filters)
      .populate("supplies.supplyId")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await ComboSupply.countDocuments(filters);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async update(id, data) {
    return await ComboSupply.findByIdAndUpdate(id, data, { new: true }).populate("supplies.supplyId");
  }

  async delete(id) {
    return await ComboSupply.findByIdAndDelete(id);
  }
}

export const comboSupplyRepository = new ComboSupplyRepository();
