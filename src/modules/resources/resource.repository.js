import { Resource } from './resource.model.js';

class ResourceRepository {
  async create(resourceData) {
    const resource = new Resource(resourceData);
    return await resource.save();
  }

  async findById(id) {
    return await Resource.findById(id).populate(['createdBy', 'allocatedTo']);
  }

  async findByName(name) {
    return await Resource.findOne({ name }).populate(['createdBy', 'allocatedTo']);
  }

  async findAll(filter = {}, pagination = { page: 1, limit: 10 }) {
    const skip = (pagination.page - 1) * pagination.limit;
    
    const data = await Resource.find(filter)
      .populate(['createdBy', 'allocatedTo'])
      .skip(skip)
      .limit(pagination.limit)
      .sort({ createdAt: -1 });

    const total = await Resource.countDocuments(filter);

    return {
      data,
      page: pagination.page,
      limit: pagination.limit,
      total,
    };
  }

  async updateById(id, updateData) {
    return await Resource.findByIdAndUpdate(id, updateData, { new: true }).populate(['createdBy', 'allocatedTo']);
  }

  async deleteById(id) {
    return await Resource.findByIdAndDelete(id);
  }

  async findByType(type, pagination = { page: 1, limit: 10 }) {
    return await this.findAll({ type }, pagination);
  }

  async findByStatus(status, pagination = { page: 1, limit: 10 }) {
    return await this.findAll({ status }, pagination);
  }

  async countByStatus(status) {
    return await Resource.countDocuments({ status });
  }

  async findExpiredResources() {
    return await Resource.find({
      expiryDate: { $lt: new Date() },
      status: { $ne: 'DEPLETED' },
    });
  }
}

export const resourceRepository = new ResourceRepository();
