import { describe, it, expect, beforeEach, jest } from '@jest/globals';

jest.unstable_mockModule('../../../../src/modules/resources/resource.repository.js', () => ({
  resourceRepository: {
    create: jest.fn(),
    findById: jest.fn(),
    findByName: jest.fn(),
    findAll: jest.fn(),
    updateById: jest.fn(),
    deleteById: jest.fn(),
    findByType: jest.fn(),
    findByStatus: jest.fn(),
    countByStatus: jest.fn(),
    findExpiredResources: jest.fn(),
  },
}));

jest.unstable_mockModule('../../../../src/utils/events.js', () => ({
  eventBus: {
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    removeAllListeners: jest.fn(),
  },
}));

const { resourceService } = await import('../../../../src/modules/resources/resource.service.js');
const { resourceRepository } = await import('../../../../src/modules/resources/resource.repository.js');
const { eventBus } = await import('../../../../src/utils/events.js');

describe('ResourceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create resource with valid data and emit RESOURCE_CREATED event', async () => {
      const resourceData = {
        name: 'Emergency Medical Kits',
        type: 'MEDICAL',
        description: 'First aid kits for emergency response',
        quantity: 100,
        unit: 'boxes',
        status: 'AVAILABLE',
        location: 'Warehouse A',
      };

      const mockCreatedResource = {
        _id: 'resource-001',
        ...resourceData,
        createdBy: 'manager-001',
      };

      resourceRepository.findByName.mockResolvedValue(null);
      resourceRepository.create.mockResolvedValue(mockCreatedResource);

      const result = await resourceService.create(resourceData, 'manager-001');

      expect(resourceRepository.findByName).toHaveBeenCalledWith('Emergency Medical Kits');
      expect(resourceRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Emergency Medical Kits',
        type: 'MEDICAL',
      }));
      expect(eventBus.emit).toHaveBeenCalledWith('RESOURCE_CREATED', expect.objectContaining({
        resourceId: 'resource-001',
        name: 'Emergency Medical Kits',
        userId: 'manager-001',
      }));
      expect(result.message).toBe('Resource created successfully');
    });

    it('should throw error when resource name already exists', async () => {
      const resourceData = {
        name: 'Existing Resource',
        type: 'FOOD',
      };

      const mockExisting = {
        _id: 'resource-001',
        name: 'Existing Resource',
      };

      resourceRepository.findByName.mockResolvedValue(mockExisting);

      await expect(resourceService.create(resourceData, 'manager-001'))
        .rejects.toThrow('Resource with this name already exists');
    });

    it('should set default status to AVAILABLE when not provided', async () => {
      const resourceData = {
        name: 'Water Bottles',
        type: 'WATER',
        quantity: 500,
        unit: 'liters',
      };

      const mockResource = {
        _id: 'resource-001',
        ...resourceData,
        status: 'AVAILABLE',
      };

      resourceRepository.findByName.mockResolvedValue(null);
      resourceRepository.create.mockResolvedValue(mockResource);

      await resourceService.create(resourceData, 'manager-001');

      expect(resourceRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        status: 'AVAILABLE',
      }));
    });
  });

  describe('getById', () => {
    it('should return resource when found', async () => {
      const mockResource = {
        _id: 'resource-001',
        name: 'Medical Kits',
        type: 'MEDICAL',
      };

      resourceRepository.findById.mockResolvedValue(mockResource);

      const result = await resourceService.getById('resource-001');

      expect(resourceRepository.findById).toHaveBeenCalledWith('resource-001');
      expect(result).toEqual(mockResource);
    });

    it('should return null when resource not found', async () => {
      resourceRepository.findById.mockResolvedValue(null);

      const result = await resourceService.getById('invalid-id');

      expect(result).toBeNull();
    });
  });

  describe('getByName', () => {
    it('should return resource by name when found', async () => {
      const mockResource = {
        _id: 'resource-001',
        name: 'Emergency Medical Kits',
        type: 'MEDICAL',
      };

      resourceRepository.findByName.mockResolvedValue(mockResource);

      const result = await resourceService.getByName('Emergency Medical Kits');

      expect(resourceRepository.findByName).toHaveBeenCalledWith('Emergency Medical Kits');
      expect(result).toEqual(mockResource);
    });

    it('should return null when resource not found by name', async () => {
      resourceRepository.findByName.mockResolvedValue(null);

      const result = await resourceService.getByName('Non-existent');

      expect(result).toBeNull();
    });
  });

  describe('list', () => {
    it('should return list with default pagination', async () => {
      const mockResources = [
        { _id: 'resource-001', name: 'Kits' },
        { _id: 'resource-002', name: 'Water' },
      ];

      resourceRepository.findAll.mockResolvedValue({
        data: mockResources,
        page: 1,
        limit: 10,
        total: 2,
      });

      const result = await resourceService.list();

      expect(resourceRepository.findAll).toHaveBeenCalledWith({}, { page: 1, limit: 10 });
      expect(result.data).toHaveLength(2);
    });

    it('should apply filter and custom pagination', async () => {
      const filter = { type: 'MEDICAL' };
      const pagination = { page: 2, limit: 20 };
      const mockResources = [{ _id: 'resource-001', type: 'MEDICAL' }];

      resourceRepository.findAll.mockResolvedValue({
        data: mockResources,
        page: 2,
        limit: 20,
        total: 1,
      });

      const result = await resourceService.list(filter, pagination);

      expect(resourceRepository.findAll).toHaveBeenCalledWith(filter, pagination);
      expect(result.data[0].type).toBe('MEDICAL');
    });
  });

  describe('getByType', () => {
    it('should return resources filtered by type', async () => {
      const mockResources = [
        { _id: 'resource-001', type: 'FOOD' },
        { _id: 'resource-002', type: 'FOOD' },
      ];

      resourceRepository.findByType.mockResolvedValue({
        data: mockResources,
        page: 1,
        limit: 10,
        total: 2,
      });

      const result = await resourceService.getByType('FOOD');

      expect(resourceRepository.findByType).toHaveBeenCalledWith('FOOD', { page: 1, limit: 10 });
      expect(result.data).toHaveLength(2);
      expect(result.data[0].type).toBe('FOOD');
    });
  });

  describe('getByStatus', () => {
    it('should return resources filtered by status', async () => {
      const mockResources = [{ _id: 'resource-001', status: 'ALLOCATED' }];

      resourceRepository.findByStatus.mockResolvedValue({
        data: mockResources,
        page: 1,
        limit: 10,
        total: 1,
      });

      const result = await resourceService.getByStatus('ALLOCATED');

      expect(resourceRepository.findByStatus).toHaveBeenCalledWith('ALLOCATED', { page: 1, limit: 10 });
      expect(result.data[0].status).toBe('ALLOCATED');
    });
  });

  describe('update', () => {
    it('should update resource and emit RESOURCE_UPDATED event', async () => {
      const mockExistingResource = {
        _id: 'resource-001',
        name: 'Medical Kits',
        type: 'MEDICAL',
      };

      const mockUpdatedResource = {
        _id: 'resource-001',
        name: 'Medical Kits',
        type: 'MEDICAL',
        quantity: 200,
      };

      resourceRepository.findById.mockResolvedValue(mockExistingResource);
      resourceRepository.updateById.mockResolvedValue(mockUpdatedResource);

      const result = await resourceService.update('resource-001', { quantity: 200 }, 'manager-001');

      expect(resourceRepository.findById).toHaveBeenCalledWith('resource-001');
      expect(resourceRepository.updateById).toHaveBeenCalledWith('resource-001', expect.objectContaining({
        quantity: 200,
      }));
      expect(eventBus.emit).toHaveBeenCalledWith('RESOURCE_UPDATED', expect.objectContaining({
        resourceId: 'resource-001',
        name: 'Medical Kits',
        userId: 'manager-001',
      }));
      expect(result.message).toBe('Resource updated successfully');
    });

    it('should throw error when resource not found for update', async () => {
      resourceRepository.findById.mockResolvedValue(null);

      await expect(resourceService.update('invalid-id', { quantity: 200 }, 'manager-001'))
        .rejects.toThrow('Resource not found');
    });

    it('should check name availability when updating name', async () => {
      const mockExistingResource = {
        _id: 'resource-001',
        name: 'Old Name',
      };

      const mockConflicting = {
        _id: 'resource-002',
        name: 'New Name',
      };

      resourceRepository.findById.mockResolvedValue(mockExistingResource);
      resourceRepository.findByName.mockResolvedValue(mockConflicting);

      await expect(resourceService.update('resource-001', { name: 'New Name' }, 'manager-001'))
        .rejects.toThrow('Resource with this name already exists');
    });

    it('should not check name if name is not being updated', async () => {
      const mockExistingResource = {
        _id: 'resource-001',
        name: 'Medical Kits',
      };

      const mockUpdatedResource = {
        _id: 'resource-001',
        name: 'Medical Kits',
        status: 'IN_USE',
      };

      resourceRepository.findById.mockResolvedValue(mockExistingResource);
      resourceRepository.updateById.mockResolvedValue(mockUpdatedResource);

      await resourceService.update('resource-001', { status: 'IN_USE' }, 'manager-001');

      expect(resourceRepository.findByName).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete resource and emit RESOURCE_DELETED event', async () => {
      const mockResource = {
        _id: 'resource-001',
        name: 'Medical Kits',
      };

      resourceRepository.findById.mockResolvedValue(mockResource);
      resourceRepository.deleteById.mockResolvedValue(mockResource);

      const result = await resourceService.delete('resource-001', 'manager-001');

      expect(resourceRepository.findById).toHaveBeenCalledWith('resource-001');
      expect(resourceRepository.deleteById).toHaveBeenCalledWith('resource-001');
      expect(eventBus.emit).toHaveBeenCalledWith('RESOURCE_DELETED', expect.objectContaining({
        resourceId: 'resource-001',
        name: 'Medical Kits',
        userId: 'manager-001',
      }));
      expect(result.message).toBe('Resource deleted successfully');
    });

    it('should throw error when resource not found for deletion', async () => {
      resourceRepository.findById.mockResolvedValue(null);

      await expect(resourceService.delete('invalid-id', 'manager-001'))
        .rejects.toThrow('Resource not found');
    });
  });

  describe('allocate', () => {
    it('should allocate resource to teams and emit RESOURCE_ALLOCATED event', async () => {
      const mockExistingResource = {
        _id: 'resource-001',
        name: 'Medical Kits',
        allocatedTo: [],
      };

      const mockUpdatedResource = {
        _id: 'resource-001',
        name: 'Medical Kits',
        allocatedTo: ['team-001', 'team-002'],
        status: 'ALLOCATED',
      };

      resourceRepository.findById.mockResolvedValue(mockExistingResource);
      resourceRepository.updateById.mockResolvedValue(mockUpdatedResource);

      const result = await resourceService.allocate('resource-001', ['team-001', 'team-002'], 'manager-001');

      expect(resourceRepository.findById).toHaveBeenCalledWith('resource-001');
      expect(resourceRepository.updateById).toHaveBeenCalledWith('resource-001', expect.objectContaining({
        allocatedTo: ['team-001', 'team-002'],
        status: 'ALLOCATED',
      }));
      expect(eventBus.emit).toHaveBeenCalledWith('RESOURCE_ALLOCATED', expect.objectContaining({
        resourceId: 'resource-001',
        teamIds: ['team-001', 'team-002'],
        userId: 'manager-001',
      }));
      expect(result.message).toBe('Resource allocated successfully');
    });

    it('should throw error when resource not found for allocation', async () => {
      resourceRepository.findById.mockResolvedValue(null);

      await expect(resourceService.allocate('invalid-id', ['team-001'], 'manager-001'))
        .rejects.toThrow('Resource not found');
    });
  });

  describe('deallocate', () => {
    it('should deallocate resource and emit RESOURCE_DEALLOCATED event', async () => {
      const mockExistingResource = {
        _id: 'resource-001',
        name: 'Medical Kits',
        allocatedTo: ['team-001', 'team-002'],
        status: 'ALLOCATED',
      };

      const mockUpdatedResource = {
        _id: 'resource-001',
        name: 'Medical Kits',
        allocatedTo: [],
        status: 'AVAILABLE',
      };

      resourceRepository.findById.mockResolvedValue(mockExistingResource);
      resourceRepository.updateById.mockResolvedValue(mockUpdatedResource);

      const result = await resourceService.deallocate('resource-001', 'manager-001');

      expect(resourceRepository.findById).toHaveBeenCalledWith('resource-001');
      expect(resourceRepository.updateById).toHaveBeenCalledWith('resource-001', expect.objectContaining({
        allocatedTo: [],
        status: 'AVAILABLE',
      }));
      expect(eventBus.emit).toHaveBeenCalledWith('RESOURCE_DEALLOCATED', expect.objectContaining({
        resourceId: 'resource-001',
        name: 'Medical Kits',
        userId: 'manager-001',
      }));
      expect(result.message).toBe('Resource deallocated successfully');
    });

    it('should throw error when resource not found for deallocation', async () => {
      resourceRepository.findById.mockResolvedValue(null);

      await expect(resourceService.deallocate('invalid-id', 'manager-001'))
        .rejects.toThrow('Resource not found');
    });
  });
});
