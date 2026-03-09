import mongoose from "mongoose";
import Supply from "./supply.model.js";
import Request from "../requests/request.model.js";
class SupplyRepository {
  /**
   * Create a new supply
   */
  async createSupply(supplyData) {
    const supply = new Supply(supplyData);
    return await supply.save();
  }

  /** 
   * Find supply by name
   */
  async findSupplyByName(supplyName) {
    return await Supply.findOne({ name: supplyName });
  }

  /**
   * Find all supplies with pagination
   */
  async findAllSupplies(filter = {}, pagination = { page: 1, limit: 10 }) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const supplies = await Supply.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Supply.countDocuments(filter);

    return {
      data: supplies,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Update supply by ID
   */
  async updateSupply(supplyId, updateData) {
    return await Supply.findByIdAndUpdate(supplyId, updateData, { new: true });
  }

  /**
   * Delete supply by ID
   */
  async deleteSupply(supplyId) {
    return await Supply.findByIdAndDelete(supplyId);
  }

  /**
   * Find all supplies sorted by category
   */
  async findAllSuppliesByCategory(filter = {}, pagination = { page: 1, limit: 10 }) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const supplies = await Supply.find(filter)
      .sort({ category: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Supply.countDocuments(filter);

    return {
      data: supplies,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Find supplies by request type
   * Returns the aggregated `requestSupplies` arrays from matching Request documents.
   */
  async getSuppliesByRequestType(type) {
    if (!Request || !Request.find) {
      throw new Error("Request model not available");
    }

    // Get requests with core fields + requestSupplies
    const requests = await Request.find({ type }).select(
      "userName userId createdBy phoneNumber type incidentType location description priority status requestSupplies createdAt"
    );

    if (!requests || requests.length === 0) return [];

    // Collect supply identifiers (could be names or ObjectId strings)
    const ids = new Set();
    const names = new Set();

    for (const r of requests) {
      for (const rs of r.requestSupplies || []) {
        const val = rs.name;
        if (!val) continue;
        // If looks like an ObjectId, treat as id, otherwise as name
        if (mongoose.Types.ObjectId.isValid(String(val))) {
          ids.add(String(val));
        } else {
          names.add(String(val));
        }
      }
    }

    // Build query to fetch all related Supply docs in one go
    const orClauses = [];
    if (ids.size) orClauses.push({ _id: { $in: Array.from(ids) } });
    if (names.size) orClauses.push({ name: { $in: Array.from(names) } });

    let supplyDocs = [];
    if (orClauses.length) {
      supplyDocs = await Supply.find({ $or: orClauses });
    }

    const supplyMapById = new Map();
    const supplyMapByName = new Map();
    for (const s of supplyDocs) {
      supplyMapById.set(String(s._id), s);
      if (s.name) supplyMapByName.set(String(s.name), s);
    }

    // Build response: for each request return the request object and its supplies details
    const result = requests.map((r) => ({
      request: r,
      supplies: (r.requestSupplies || []).map((rs) => {
        const lookupKey = String(rs.name || "");
        const supplyDoc = supplyMapById.get(lookupKey) || supplyMapByName.get(lookupKey) || null;
        return {
          requestedQty: rs.requestedQty,
          supply: supplyDoc,
        };
      }),
    }));

    return result;
  }
}

const supplyRepository = new SupplyRepository();
export { supplyRepository };