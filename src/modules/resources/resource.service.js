import { resourceRepository } from './resource.repository.js';
import { eventBus } from '../../utils/events.js';

class ResourceService {
  async create(resourceData, userId) {
    const { name, type, description, quantity, unit, status = 'AVAILABLE', location, expiryDate } = resourceData;

    // Check if resource name already exists
    const existing = await resourceRepository.findByName(name);
    if (existing) {
      const error = new Error('Resource with this name already exists');
      error.statusCode = 400;
      throw error;
    }

    const newResource = await resourceRepository.create({
      name,
      type,
      description,
      quantity,
      unit,
      status,
      location,
      expiryDate,
      createdBy: userId,
    });

    eventBus.emit('RESOURCE_CREATED', {
      resourceId: newResource._id,
      name: newResource.name,
      userId,
    });

    return {
      message: 'Resource created successfully',
      data: newResource,
    };
  }

  async getById(resourceId) {
    return await resourceRepository.findById(resourceId);
  }

  async getByName(name) {
    return await resourceRepository.findByName(name);
  }

  async list(filter = {}, pagination = { page: 1, limit: 10 }) {
    return await resourceRepository.findAll(filter, pagination);
  }

  async getByType(type, pagination = { page: 1, limit: 10 }) {
    return await resourceRepository.findByType(type, pagination);
  }

  async getByStatus(status, pagination = { page: 1, limit: 10 }) {
    return await resourceRepository.findByStatus(status, pagination);
  }

  async update(resourceId, updateData, userId) {
    const resource = await resourceRepository.findById(resourceId);

    if (!resource) {
      const error = new Error('Resource not found');
      error.statusCode = 404;
      throw error;
    }

    // Check if trying to update name to an existing one
    if (updateData.name && updateData.name !== resource.name) {
      const existing = await resourceRepository.findByName(updateData.name);
      if (existing) {
        const error = new Error('Resource with this name already exists');
        error.statusCode = 400;
        throw error;
      }
    }

    const updatedResource = await resourceRepository.updateById(resourceId, {
      ...updateData,
      lastUpdated: new Date(),
    });

    eventBus.emit('RESOURCE_UPDATED', {
      resourceId: updatedResource._id,
      name: updatedResource.name,
      userId,
    });

    return {
      message: 'Resource updated successfully',
      data: updatedResource,
    };
  }

  async delete(resourceId, userId) {
    const resource = await resourceRepository.findById(resourceId);

    if (!resource) {
      const error = new Error('Resource not found');
      error.statusCode = 404;
      throw error;
    }

    const deletedResource = await resourceRepository.deleteById(resourceId);

    eventBus.emit('RESOURCE_DELETED', {
      resourceId: deletedResource._id,
      name: deletedResource.name,
      userId,
    });

    return {
      message: 'Resource deleted successfully',
      data: deletedResource,
    };
  }

  async allocate(resourceId, teamIds, userId) {
    const resource = await resourceRepository.findById(resourceId);

    if (!resource) {
      const error = new Error('Resource not found');
      error.statusCode = 404;
      throw error;
    }

    const updatedResource = await resourceRepository.updateById(resourceId, {
      allocatedTo: teamIds,
      status: 'ALLOCATED',
    });

    eventBus.emit('RESOURCE_ALLOCATED', {
      resourceId: updatedResource._id,
      name: updatedResource.name,
      teamIds,
      userId,
    });

    return {
      message: 'Resource allocated successfully',
      data: updatedResource,
    };
  }

  async deallocate(resourceId, userId) {
    const resource = await resourceRepository.findById(resourceId);

    if (!resource) {
      const error = new Error('Resource not found');
      error.statusCode = 404;
      throw error;
    }

    const updatedResource = await resourceRepository.updateById(resourceId, {
      allocatedTo: [],
      status: 'AVAILABLE',
    });

    eventBus.emit('RESOURCE_DEALLOCATED', {
      resourceId: updatedResource._id,
      name: updatedResource.name,
      userId,
    });

    return {
      message: 'Resource deallocated successfully',
      data: updatedResource,
    };
  }
}

export const resourceService = new ResourceService();
