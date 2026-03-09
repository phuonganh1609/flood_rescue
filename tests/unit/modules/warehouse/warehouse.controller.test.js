import { describe, it, expect, beforeEach, jest } from '@jest/globals';

jest.unstable_mockModule('../../../../src/modules/warehouse/warehouse.service.js', () => ({
  warehouseService: {
    create: jest.fn(),
    getByName: jest.fn(),
    list: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  },
}));

jest.unstable_mockModule('../../../../src/utils/response.js', () => ({
  default: {
    sendSuccess: jest.fn(),
    sendError: jest.fn(),
  },
}));

const warehouseController = await import('../../../../src/modules/warehouse/warehouse.controller.js');
const { warehouseService } = await import('../../../../src/modules/warehouse/warehouse.service.js');
const response = (await import('../../../../src/utils/response.js')).default;

describe('WarehouseController', () => {
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRes = {};
    response.sendSuccess.mockReturnValue(mockRes);
    response.sendError.mockReturnValue(mockRes);
  });

  describe('add (create)', () => {
    it('should create warehouse with valid body and return 201', async () => {
      const mockReq = {
        body: {
          name: 'Main Warehouse',
          location: { type: 'Point', coordinates: [105.8, 21.0] },
        },
        user: { id: 'manager-001' },
      };

      const mockCreatedWarehouse = {
        _id: 'wh-001',
        name: 'Main Warehouse',
        status: 'EMPTY',
        location: { type: 'Point', coordinates: [105.8, 21.0] },
      };

      warehouseService.create.mockResolvedValue({
        message: 'Warehouse created successfully',
        data: mockCreatedWarehouse,
      });

      await warehouseController.add(mockReq, mockRes);

      expect(response.sendSuccess).toHaveBeenCalledWith(
        mockRes,
        expect.objectContaining({
          data: mockCreatedWarehouse,
          statusCode: 201,
          message: 'Warehouse created successfully',
        })
      );
    });

    it('should return 400 when validation fails', async () => {
      const mockReq = {
        body: {
          // missing required fields
        },
        user: { id: 'manager-001' },
      };

      await warehouseController.add(mockReq, mockRes);

      expect(response.sendError).toHaveBeenCalled();
    });

    it('should handle service error and return appropriate status code', async () => {
      const mockReq = {
        body: {
          name: 'Invalid Warehouse',
          location: { type: 'Point', coordinates: [181, 21.0] },
        },
        user: { id: 'manager-001' },
      };

      const error = new Error('Longitude must be between -180 and 180');
      warehouseService.create.mockRejectedValue(error);

      await warehouseController.add(mockReq, mockRes);

      expect(response.sendError).toHaveBeenCalled();
    });
  });

  describe('getByName', () => {
    it('should return warehouse when found', async () => {
      const mockReq = {
        query: { name: 'Main Warehouse' },
        user: { id: 'manager-001' },
      };

      const mockWarehouse = {
        _id: 'wh-001',
        name: 'Main Warehouse',
        status: 'EMPTY',
      };

      warehouseService.getByName.mockResolvedValue(mockWarehouse);

      await warehouseController.getByName(mockReq, mockRes);

      expect(warehouseService.getByName).toHaveBeenCalledWith(
        'Main Warehouse'
      );
      expect(response.sendSuccess).toHaveBeenCalledWith(mockRes, {
        data: mockWarehouse,
      });
    });

    it('should return 400 when name query is missing', async () => {
      const mockReq = {
        query: {},
        user: { id: 'manager-001' },
      };

      await warehouseController.getByName(mockReq, mockRes);

      expect(response.sendError).toHaveBeenCalledWith(mockRes, {
        message: 'Name is required',
        statusCode: 400,
      });
    });

    it('should return 404 when warehouse not found', async () => {
      const mockReq = {
        query: { name: 'Non Existent' },
        user: { id: 'manager-001' },
      };

      warehouseService.getByName.mockResolvedValue(null);

      await warehouseController.getByName(mockReq, mockRes);

      expect(response.sendError).toHaveBeenCalledWith(mockRes, {
        message: 'Warehouse not found',
        statusCode: 404,
      });
    });
  });

  describe('getAll', () => {
    it('should return all warehouses with default pagination', async () => {
      const mockReq = {
        query: {},
        user: { id: 'manager-001' },
      };

      const mockResult = {
        data: [
          { _id: 'wh-001', name: 'Warehouse 1', status: 'EMPTY' },
          { _id: 'wh-002', name: 'Warehouse 2', status: 'FULL' },
        ],
        page: 1,
        limit: 10,
        total: 2,
      };

      warehouseService.list.mockResolvedValue(mockResult);

      await warehouseController.getAll(mockReq, mockRes);

      expect(warehouseService.list).toHaveBeenCalledWith(
        {},
        { page: 1, limit: 10 }
      );
      expect(response.sendSuccess).toHaveBeenCalledWith(mockRes, {
        data: mockResult.data,
        meta: { page: 1, limit: 10, total: 2 },
      });
    });

    it('should filter by name with regex', async () => {
      const mockReq = {
        query: { page: 2, limit: 5, name: 'Main' },
        user: { id: 'manager-001' },
      };

      const mockResult = {
        data: [{ _id: 'wh-001', name: 'Main Warehouse', status: 'EMPTY' }],
        page: 2,
        limit: 5,
        total: 1,
      };

      warehouseService.list.mockResolvedValue(mockResult);

      await warehouseController.getAll(mockReq, mockRes);

      expect(warehouseService.list).toHaveBeenCalledWith(
        { name: expect.any(RegExp) },
        { page: 2, limit: 5 }
      );
    });

    it('should filter by status', async () => {
      const mockReq = {
        query: { status: 'EMPTY' },
        user: { id: 'manager-001' },
      };

      const mockResult = {
        data: [{ _id: 'wh-001', name: 'Warehouse 1', status: 'EMPTY' }],
        page: 1,
        limit: 10,
        total: 1,
      };

      warehouseService.list.mockResolvedValue(mockResult);

      await warehouseController.getAll(mockReq, mockRes);

      expect(warehouseService.list).toHaveBeenCalledWith(
        { status: 'EMPTY' },
        { page: 1, limit: 10 }
      );
    });

    it('should use default page=1 and limit=10 when not provided', async () => {
      const mockReq = {
        query: { page: 'invalid', limit: 'invalid' },
        user: { id: 'manager-001' },
      };

      const mockResult = {
        data: [],
        page: 1,
        limit: 10,
        total: 0,
      };

      warehouseService.list.mockResolvedValue(mockResult);

      await warehouseController.getAll(mockReq, mockRes);

      expect(warehouseService.list).toHaveBeenCalledWith(
        {},
        { page: 1, limit: 10 }
      );
    });
  });

  describe('update', () => {
    it('should update warehouse and return success', async () => {
      const mockReq = {
        params: { name: 'Old Name' },
        body: { status: 'FULL' },
        user: { id: 'manager-001' },
      };

      const mockUpdatedWarehouse = {
        _id: 'wh-001',
        name: 'Old Name',
        status: 'FULL',
      };

      warehouseService.update.mockResolvedValue(mockUpdatedWarehouse);

      await warehouseController.update(mockReq, mockRes);

      expect(response.sendSuccess).toHaveBeenCalledWith(mockRes, {
        data: mockUpdatedWarehouse,
        message: 'Warehouse updated',
      });
    });

    it('should return 404 when warehouse not found', async () => {
      const mockReq = {
        params: { name: 'Non Existent' },
        body: { status: 'FULL' },
        user: { id: 'manager-001' },
      };

      warehouseService.update.mockResolvedValue(null);

      await warehouseController.update(mockReq, mockRes);

      expect(response.sendError).toHaveBeenCalledWith(mockRes, {
        message: 'Warehouse not found',
        statusCode: 404,
      });
    });

    it('should handle service errors', async () => {
      const mockReq = {
        params: { name: 'Warehouse 1' },
        body: { location: { type: 'Point', coordinates: [181, 21] } },
        user: { id: 'manager-001' },
      };

      const error = new Error('Longitude must be between -180 and 180');
      warehouseService.update.mockRejectedValue(error);

      await warehouseController.update(mockReq, mockRes);

      expect(response.sendError).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete warehouse and return success', async () => {
      const mockReq = {
        params: { name: 'Warehouse 1' },
        user: { id: 'manager-001' },
      };

      const mockDeletedWarehouse = {
        _id: 'wh-001',
        name: 'Warehouse 1',
      };

      warehouseService.remove.mockResolvedValue(mockDeletedWarehouse);

      await warehouseController.remove(mockReq, mockRes);

      expect(response.sendSuccess).toHaveBeenCalledWith(mockRes, {
        data: mockDeletedWarehouse,
        message: 'Warehouse deleted',
      });
    });

    it('should return 404 when warehouse not found', async () => {
      const mockReq = {
        params: { name: 'Non Existent' },
        user: { id: 'manager-001' },
      };

      warehouseService.remove.mockResolvedValue(null);

      await warehouseController.remove(mockReq, mockRes);

      expect(response.sendError).toHaveBeenCalledWith(mockRes, {
        message: 'Warehouse not found',
        statusCode: 404,
      });
    });

    it('should handle service errors', async () => {
      const mockReq = {
        params: { name: 'Warehouse 1' },
        user: { id: 'manager-001' },
      };

      const error = new Error('Database error');
      warehouseService.remove.mockRejectedValue(error);

      await warehouseController.remove(mockReq, mockRes);

      expect(response.sendError).toHaveBeenCalled();
    });
  });
});
