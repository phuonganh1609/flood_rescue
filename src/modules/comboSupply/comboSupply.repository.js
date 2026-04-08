import ComboSupply from "./comboSupply.model.js";

class ComboSupplyRepository {
  async create(data) {
    return await ComboSupply.create(data);
  }

  async findById(id) {
    return await ComboSupply.findById(id).populate("supplies.supplyId");
  }

  async findAll(query = {}) {
    const filters = {};
    if (query.incidentType) filters.incidentType = query.incidentType;
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
