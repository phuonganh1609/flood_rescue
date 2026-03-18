import { describe, it, expect, beforeEach, jest } from '@jest/globals';

jest.unstable_mockModule('mongoose', () => {
  const mockSchema = {
    Types: {
      ObjectId: {
        isValid: jest.fn((id) => /^[0-9a-fA-F]{24}$/.test(id)),
      },
    },
  };
  
  return {
    default: {
      Schema: jest.fn(() => mockSchema),
      Types: {
        ObjectId: {
          isValid: jest.fn((id) => /^[0-9a-fA-F]{24}$/.test(id)),
        },
      },
    },
    Schema: jest.fn(() => mockSchema),
    Types: {
      ObjectId: {
        isValid: jest.fn((id) => /^[0-9a-fA-F]{24}$/.test(id)),
      },
    },
  };
});

jest.unstable_mockModule('../../../../src/modules/inventory/inventoryItem.model.js', () => ({
  INVENTORY_ITEM_STATUS: {
    ACTIVE: 'ACTIVE',
    OUT_OF_STOCK: 'OUT_OF_STOCK',
    RESERVED: 'RESERVED',
  },
  InventoryItem: {
    _id: 'inv-001',
    description: 'Mock inventory item',
  },
}));

jest.unstable_mockModule('../../../../src/modules/supply/supply.model.js', () => ({
  default: {
    find: jest.fn(),
    findById: jest.fn(),
  },
}));

jest.unstable_mockModule('../../../../src/modules/vehicles/vehicle.model.js', () => ({
  default: {
    find: jest.fn(),
    findById: jest.fn(),
  },
}));

jest.unstable_mockModule('../../../../src/modules/warehouse/warehouse.model.js', () => ({
  Warehouse: {
    find: jest.fn(),
    findById: jest.fn(),
  },
}));

jest.unstable_mockModule('../../../../src/modules/inventory/inventoryItem.validation.js', () => ({
  createSchema: {
    validate: jest.fn(({ body }, { abortEarly }) => {
      if (!body.warehouse) {
        return {
          error: {
            details: [{ path: ['warehouse'], message: 'warehouse is required' }],
          },
        };
      }
      return { error: null, value: body };
    }),
  },
  updateSchema: {
    validate: jest.fn(({ body }, { abortEarly }) => {
      return { error: null, value: body };
    }),
  },
}));

jest.unstable_mockModule('../../../../src/modules/inventory/inventoryItem.service.js', () => ({
  inventoryItemService: {
    create: jest.fn(),
    getById: jest.fn(),
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

const controller = await import('../../../../src/modules/inventory/inventoryItem.controller.js');
const { inventoryItemService } = await import('../../../../src/modules/inventory/inventoryItem.service.js');
const response = (await import('../../../../src/utils/response.js')).default;

describe('InventoryItemController', () => {
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRes = {};
    response.sendSuccess.mockReturnValue(mockRes);
    response.sendError.mockReturnValue(mockRes);
  });

  describe('create', () => {
    it('should create inventory item with valid body and return 201', async () => {
      const mockReq = {
        body: {
          supplyID: 'supply-001',
          description: 'Medical supplies',
          quantity: 100,
          reservedQuantity: 20,
          unit: 'boxes',
          warehouse: 'wh-001',
          status: 'ACTIVE',
        },
        user: { id: 'manager-001' },
      };

      const mockCreatedItem = {
        _id: 'inv-001',
        ...mockReq.body,
        createdBy: 'manager-001',
      };

      inventoryItemService.create.mockResolvedValue({
        message: 'Inventory item created successfully',
        data: mockCreatedItem,
      });

      await controller.create(mockReq, mockRes);

      expect(response.sendSuccess).toHaveBeenCalledWith(mockRes, expect.objectContaining({
        statusCode: 201,
        message: 'Inventory item created successfully',
      }));
    });

    it('should return 400 when required fields are missing', async () => {
      const mockReq = {
        body: {
          // missing required fields
        },
        user: { id: 'manager-001' },
      };

      await controller.create(mockReq, mockRes);

      expect(response.sendError).toHaveBeenCalled();
    });

    it('should handle service errors and return error response', async () => {
      const mockReq = {
        body: {
          supplyID: 'invalid-supply',
          warehouse: 'wh-001',
        },
        user: { id: 'manager-001' },
      };

      const error = new Error('Supply not found');
      inventoryItemService.create.mockRejectedValue(error);

      await controller.create(mockReq, mockRes);

      expect(response.sendError).toHaveBeenCalled();
    });
  });

  describe('getByID', () => {
    it('should return inventory item when found', async () => {
      const mockReq = {
        params: { id: '507f1f77bcf86cd799439011' },
      };

      const mockItem = {
        _id: '507f1f77bcf86cd799439011',
        description: 'Medical supplies',
        quantity: 100,
      };

      inventoryItemService.getById.mockResolvedValue(mockItem);

      await controller.getByID(mockReq, mockRes);

      expect(inventoryItemService.getById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(response.sendSuccess).toHaveBeenCalledWith(mockRes, expect.objectContaining({
        data: mockItem,
      }));
    });

    it('should return 404 when inventory item not found', async () => {
      const mockReq = {
        params: { id: '507f1f77bcf86cd799439011' },
      };

      inventoryItemService.getById.mockResolvedValue(null);

      await controller.getByID(mockReq, mockRes);

      expect(response.sendError).toHaveBeenCalledWith(mockRes, expect.objectContaining({
        message: 'Not found',
        statusCode: 404,
      }));
    });

    it('should return 400 for invalid ObjectId format', async () => {
      const mockReq = {
        params: { id: 'invalid-id' },
      };

      await controller.getByID(mockReq, mockRes);

      expect(response.sendError).toHaveBeenCalledWith(mockRes, expect.objectContaining({
        message: 'Invalid request ID',
        statusCode: 400,
      }));
    });
  });

  describe('getAll', () => {
    it('should return all inventory items with default pagination', async () => {
      const mockReq = {
        query: {},
      };

      const mockResult = {
        data: [
          { _id: 'inv-001', description: 'Item 1' },
          { _id: 'inv-002', description: 'Item 2' },
        ],
        page: 1,
        limit: 10,
        total: 2,
      };

      inventoryItemService.list.mockResolvedValue(mockResult);

      await controller.getAll(mockReq, mockRes);

      expect(inventoryItemService.list).toHaveBeenCalledWith({}, { page: 1, limit: 10 });
      expect(response.sendSuccess).toHaveBeenCalledWith(mockRes, expect.objectContaining({
        data: mockResult.data,
      }));
    });

    it('should filter by supply ID', async () => {
      const mockReq = {
        query: { supplyId: 'supply-001' },
      };

      const mockResult = {
        data: [{ _id: 'inv-001', supplyID: 'supply-001' }],
        page: 1,
        limit: 10,
        total: 1,
      };

      inventoryItemService.list.mockResolvedValue(mockResult);

      await controller.getAll(mockReq, mockRes);

      expect(inventoryItemService.list).toHaveBeenCalledWith(
        expect.objectContaining({ supplyID: 'supply-001' }),
        { page: 1, limit: 10 }
      );
    });

    it('should filter by warehouse ID', async () => {
      const mockReq = {
        query: { warehouseId: 'wh-001' },
      };

      const mockResult = {
        data: [{ _id: 'inv-001', warehouse: 'wh-001' }],
        page: 1,
        limit: 10,
        total: 1,
      };

      inventoryItemService.list.mockResolvedValue(mockResult);

      await controller.getAll(mockReq, mockRes);

      expect(inventoryItemService.list).toHaveBeenCalledWith(
        expect.objectContaining({ warehouse: 'wh-001' }),
        { page: 1, limit: 10 }
      );
    });

    it('should filter by quantity, unit, and status', async () => {
      const mockReq = {
        query: {
          quantity: 100,
          unit: 'boxes',
          status: 'ACTIVE',
        },
      };

      const mockResult = {
        data: [{ _id: 'inv-001', quantity: 100, unit: 'boxes', status: 'ACTIVE' }],
        page: 1,
        limit: 10,
        total: 1,
      };

      inventoryItemService.list.mockResolvedValue(mockResult);

      await controller.getAll(mockReq, mockRes);

      expect(inventoryItemService.list).toHaveBeenCalledWith(
        expect.objectContaining({
          quantity: '100',
          unit: 'boxes',
          status: 'ACTIVE',
        }),
        { page: 1, limit: 10 }
      );
    });

    it('should use custom pagination', async () => {
      const mockReq = {
        query: { page: '2', limit: '20' },
      };

      const mockResult = {
        data: [],
        page: 2,
        limit: 20,
        total: 0,
      };

      inventoryItemService.list.mockResolvedValue(mockResult);

      await controller.getAll(mockReq, mockRes);

      expect(inventoryItemService.list).toHaveBeenCalledWith({}, { page: 2, limit: 20 });
    });

    it('should handle service errors', async () => {
      const mockReq = {
        query: {},
      };

      const error = new Error('Database error');
      inventoryItemService.list.mockRejectedValue(error);

      await controller.getAll(mockReq, mockRes);

      expect(response.sendError).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update inventory item and return success', async () => {
      const mockReq = {
        params: { name: 'inv-001' },
        body: {
          quantity: 150,
          status: 'LOW_STOCK',
        },
      };

      const mockUpdatedItem = {
        _id: 'inv-001',
        ...mockReq.body,
      };

      inventoryItemService.update.mockResolvedValue(mockUpdatedItem);

      await controller.update(mockReq, mockRes);

      expect(inventoryItemService.update).toHaveBeenCalledWith('inv-001', expect.any(Object));
      expect(response.sendSuccess).toHaveBeenCalledWith(mockRes, expect.objectContaining({
        data: mockUpdatedItem,
        message: 'Inventory item updated',
      }));
    });

    it('should return 404 when inventory item not found', async () => {
      const mockReq = {
        params: { name: 'invalid-id' },
        body: { quantity: 150 },
      };

      inventoryItemService.update.mockResolvedValue(null);

      await controller.update(mockReq, mockRes);

      expect(response.sendError).toHaveBeenCalledWith(mockRes, expect.objectContaining({
        message: 'Inventory item not found',
        statusCode: 404,
      }));
    });

    it('should return 400 when validation fails', async () => {
      const mockReq = {
        params: { name: 'inv-001' },
        body: { quantity: 'invalid' }, // invalid type
      };

      await controller.update(mockReq, mockRes);

      expect(response.sendError).toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      const mockReq = {
        params: { name: 'inv-001' },
        body: { quantity: 150 },
      };

      const error = new Error('Update failed');
      inventoryItemService.update.mockRejectedValue(error);

      await controller.update(mockReq, mockRes);

      expect(response.sendError).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete inventory item and return success', async () => {
      const mockReq = {
        params: { name: 'inv-001' },
      };

      const mockDeletedItem = {
        _id: 'inv-001',
        description: 'Medical supplies',
      };

      inventoryItemService.remove.mockResolvedValue(mockDeletedItem);

      await controller.remove(mockReq, mockRes);

      expect(inventoryItemService.remove).toHaveBeenCalledWith('inv-001');
      expect(response.sendSuccess).toHaveBeenCalledWith(mockRes, expect.objectContaining({
        data: mockDeletedItem,
        message: 'Inventory item deleted',
      }));
    });

    it('should return 404 when inventory item not found', async () => {
      const mockReq = {
        params: { name: 'invalid-id' },
      };

      inventoryItemService.remove.mockResolvedValue(null);

      await controller.remove(mockReq, mockRes);

      expect(response.sendError).toHaveBeenCalledWith(mockRes, expect.objectContaining({
        message: 'Inventory item not found',
        statusCode: 404,
      }));
    });

    it('should handle service errors', async () => {
      const mockReq = {
        params: { name: 'inv-001' },
      };

      const error = new Error('Delete failed');
      inventoryItemService.remove.mockRejectedValue(error);

      await controller.remove(mockReq, mockRes);

      expect(response.sendError).toHaveBeenCalled();
    });
  });
});
