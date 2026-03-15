import { describe, it, expect, beforeEach, jest } from '@jest/globals';

jest.unstable_mockModule('../../../../src/modules/warehouse/warehouse.responsitory.js', () => ({
  warehouseRepository: {
    create: jest.fn(),
    findByName: jest.fn(),
    findAll: jest.fn(),
    updateByName: jest.fn(),
    deleteByName: jest.fn(),
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

const { warehouseService } = await import('../../../../src/modules/warehouse/warehouse.service.js');
const { warehouseRepository } = await import('../../../../src/modules/warehouse/warehouse.responsitory.js');
const { eventBus } = await import('../../../../src/utils/events.js');

describe('WarehouseService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('_validateLocation', () => {
    it('should accept valid GeoJSON Point coordinates', () => {
      const location = { type: 'Point', coordinates: [105.8, 21.0] };
      const result = warehouseService._validateLocation(location);
      expect(result).toEqual({ type: 'Point', coordinates: [105.8, 21.0] });
    });

    it('should throw error when location is null', () => {
      expect(() => warehouseService._validateLocation(null)).toThrow(
        'Location must have coordinates array'
      );
    });

    it('should throw error when coordinates is missing', () => {
      const location = { type: 'Point' };
      expect(() => warehouseService._validateLocation(location)).toThrow(
        'Location must have coordinates array'
      );
    });

    it('should throw error when coordinates is not an array', () => {
      const location = { type: 'Point', coordinates: '105.8, 21.0' };
      expect(() => warehouseService._validateLocation(location)).toThrow(
        'Location must have coordinates array'
      );
    });

    it('should throw error when coordinates contain non-numeric values', () => {
      const location = { type: 'Point', coordinates: ['105.8', 21.0] };
      expect(() => warehouseService._validateLocation(location)).toThrow(
        'Coordinates must be numbers'
      );
    });

    it('should throw error when longitude is out of range (< -180)', () => {
      const location = { type: 'Point', coordinates: [-181, 21.0] };
      expect(() => warehouseService._validateLocation(location)).toThrow(
        'Longitude must be between -180 and 180'
      );
    });

    it('should throw error when longitude is out of range (> 180)', () => {
      const location = { type: 'Point', coordinates: [181, 21.0] };
      expect(() => warehouseService._validateLocation(location)).toThrow(
        'Longitude must be between -180 and 180'
      );
    });

    it('should throw error when latitude is out of range (< -90)', () => {
      const location = { type: 'Point', coordinates: [105.8, -91] };
      expect(() => warehouseService._validateLocation(location)).toThrow(
        'Latitude must be between -90 and 90'
      );
    });

    it('should throw error when latitude is out of range (> 90)', () => {
      const location = { type: 'Point', coordinates: [105.8, 91] };
      expect(() => warehouseService._validateLocation(location)).toThrow(
        'Latitude must be between -90 and 90'
      );
    });

    it('should accept longitude and latitude edge values', () => {
      const location = { type: 'Point', coordinates: [-180, -90] };
      const result = warehouseService._validateLocation(location);
      expect(result).toEqual({ type: 'Point', coordinates: [-180, -90] });

      const location2 = { type: 'Point', coordinates: [180, 90] };
      const result2 = warehouseService._validateLocation(location2);
      expect(result2).toEqual({ type: 'Point', coordinates: [180, 90] });
    });
  });

  describe('create', () => {
    it('should create warehouse with valid data and emit WAREHOUSE_CREATED event', async () => {
      const mockWarehouse = {
        _id: 'wh-001',
        name: 'Main Warehouse',
        location: { type: 'Point', coordinates: [105.8, 21.0] },
        status: 'EMPTY',
        createdBy: 'manager-001',
      };

      warehouseRepository.create.mockResolvedValue(mockWarehouse);

      const warehouseData = {
        name: 'Main Warehouse',
        location: { type: 'Point', coordinates: [105.8, 21.0] },
      };

      const result = await warehouseService.create(warehouseData, 'manager-001');

      expect(warehouseRepository.create).toHaveBeenCalledWith({
        name: 'Main Warehouse',
        location: { type: 'Point', coordinates: [105.8, 21.0] },
        status: 'EMPTY',
        createdBy: 'manager-001',
      });

      expect(eventBus.emit).toHaveBeenCalledWith('WAREHOUSE_CREATED', {
        warehouseId: 'wh-001',
        userId: 'manager-001',
      });

      expect(result).toEqual({
        message: 'Warehouse created successfully',
        data: mockWarehouse,
      });
    });

    it('should create warehouse with custom status', async () => {
      const mockWarehouse = {
        _id: 'wh-002',
        name: 'Secondary Warehouse',
        location: { type: 'Point', coordinates: [105.8, 21.0] },
        status: 'FULL',
        createdBy: 'manager-001',
      };

      warehouseRepository.create.mockResolvedValue(mockWarehouse);

      const warehouseData = {
        name: 'Secondary Warehouse',
        location: { type: 'Point', coordinates: [105.8, 21.0] },
        status: 'FULL',
      };

      await warehouseService.create(warehouseData, 'manager-001');

      expect(warehouseRepository.create).toHaveBeenCalledWith({
        name: 'Secondary Warehouse',
        location: { type: 'Point', coordinates: [105.8, 21.0] },
        status: 'FULL',
        createdBy: 'manager-001',
      });
    });

    it('should throw error when location validation fails', async () => {
      const warehouseData = {
        name: 'Invalid Warehouse',
        location: { type: 'Point', coordinates: [181, 21.0] },
      };

      await expect(
        warehouseService.create(warehouseData, 'manager-001')
      ).rejects.toThrow('Longitude must be between -180 and 180');

      expect(warehouseRepository.create).not.toHaveBeenCalled();
      expect(eventBus.emit).not.toHaveBeenCalled();
    });
  });

  describe('getByName', () => {
    it('should return warehouse when found', async () => {
      const mockWarehouse = {
        _id: 'wh-001',
        name: 'Main Warehouse',
        location: { type: 'Point', coordinates: [105.8, 21.0] },
        status: 'EMPTY',
      };

      warehouseRepository.findByName.mockResolvedValue(mockWarehouse);

      const result = await warehouseService.getByName('Main Warehouse');

      expect(warehouseRepository.findByName).toHaveBeenCalledWith(
        'Main Warehouse'
      );
      expect(result).toEqual(mockWarehouse);
    });

    it('should return null when warehouse not found', async () => {
      warehouseRepository.findByName.mockResolvedValue(null);

      const result = await warehouseService.getByName('Non Existent');

      expect(result).toBeNull();
    });
  });

  describe('list', () => {
    it('should return list of warehouses with default pagination', async () => {
      const mockWarehouses = [
        {
          _id: 'wh-001',
          name: 'Warehouse 1',
          status: 'EMPTY',
        },
        {
          _id: 'wh-002',
          name: 'Warehouse 2',
          status: 'FULL',
        },
      ];

      warehouseRepository.findAll.mockResolvedValue({
        data: mockWarehouses,
        page: 1,
        limit: 10,
        total: 2,
      });

      const result = await warehouseService.list();

      expect(warehouseRepository.findAll).toHaveBeenCalledWith(
        {},
        { page: 1, limit: 10 }
      );
      expect(result.data).toEqual(mockWarehouses);
    });

    it('should return filtered list with custom pagination', async () => {
      const mockWarehouses = [
        { _id: 'wh-001', name: 'Warehouse 1', status: 'EMPTY' },
      ];

      warehouseRepository.findAll.mockResolvedValue({
        data: mockWarehouses,
        page: 2,
        limit: 5,
        total: 1,
      });

      const filter = { status: 'EMPTY' };
      const pagination = { page: 2, limit: 5 };

      const result = await warehouseService.list(filter, pagination);

      expect(warehouseRepository.findAll).toHaveBeenCalledWith(
        filter,
        pagination
      );
      expect(result.data).toEqual(mockWarehouses);
    });
  });

  describe('update', () => {
    it('should update warehouse and emit WAREHOUSE_UPDATED event', async () => {
      const mockUpdatedWarehouse = {
        _id: 'wh-001',
        name: 'Updated Warehouse',
        status: 'FULL',
      };

      warehouseRepository.updateByName.mockResolvedValue(mockUpdatedWarehouse);

      const payload = { status: 'FULL' };
      const result = await warehouseService.update('Warehouse 1', payload);

      expect(warehouseRepository.updateByName).toHaveBeenCalledWith(
        'Warehouse 1',
        payload
      );

      expect(eventBus.emit).toHaveBeenCalledWith('WAREHOUSE_UPDATED', {
        warehouseName: 'Updated Warehouse',
        updatedFields: payload,
      });

      expect(result).toEqual(mockUpdatedWarehouse);
    });

    it('should validate location when updating with new coordinates', async () => {
      const mockUpdatedWarehouse = {
        _id: 'wh-001',
        name: 'Warehouse 1',
        location: { type: 'Point', coordinates: [106.0, 21.5] },
      };

      warehouseRepository.updateByName.mockResolvedValue(mockUpdatedWarehouse);

      const payload = {
        location: { type: 'Point', coordinates: [106.0, 21.5] },
      };

      await warehouseService.update('Warehouse 1', payload);

      expect(warehouseRepository.updateByName).toHaveBeenCalledWith(
        'Warehouse 1',
        {
          location: { type: 'Point', coordinates: [106.0, 21.5] },
        }
      );
    });

    it('should throw error when location validation fails during update', async () => {
      const payload = {
        location: { type: 'Point', coordinates: [181, 21.0] },
      };

      await expect(
        warehouseService.update('Warehouse 1', payload)
      ).rejects.toThrow('Longitude must be between -180 and 180');

      expect(warehouseRepository.updateByName).not.toHaveBeenCalled();
      expect(eventBus.emit).not.toHaveBeenCalled();
    });

    it('should throw error when warehouse not found', async () => {
      warehouseRepository.updateByName.mockResolvedValue(null);

      const payload = { status: 'FULL' };

      await expect(
        warehouseService.update('Non Existent', payload)
      ).rejects.toThrow('Warehouse not found');

      expect(eventBus.emit).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete warehouse and emit WAREHOUSE_DELETED event', async () => {
      const mockDeletedWarehouse = {
        _id: 'wh-001',
        name: 'Warehouse 1',
      };

      warehouseRepository.deleteByName.mockResolvedValue(
        mockDeletedWarehouse
      );

      const result = await warehouseService.remove('Warehouse 1');

      expect(warehouseRepository.deleteByName).toHaveBeenCalledWith(
        'Warehouse 1'
      );

      expect(eventBus.emit).toHaveBeenCalledWith('WAREHOUSE_DELETED', {
        warehouseId: 'wh-001',
      });

      expect(result).toEqual(mockDeletedWarehouse);
    });

    it('should not emit event when warehouse not found', async () => {
      warehouseRepository.deleteByName.mockResolvedValue(null);

      const result = await warehouseService.remove('Non Existent');

      expect(result).toBeNull();
      expect(eventBus.emit).not.toHaveBeenCalled();
    });
  });
});
