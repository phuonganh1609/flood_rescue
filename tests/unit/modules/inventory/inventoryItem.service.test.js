import { describe, it, expect, beforeEach, jest } from '@jest/globals';

const mockSession = {
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  abortTransaction: jest.fn(),
  endSession: jest.fn(),
};

class MockSchema { constructor() {} }
MockSchema.Types = { ObjectId: String };

jest.unstable_mockModule("mongoose", () => ({
  default: {
    startSession: jest.fn().mockResolvedValue(mockSession),
    Schema: MockSchema,
    model: jest.fn()
  }
}));

jest.unstable_mockModule('../../../../src/modules/missionSupplies/missionSupply.model.js', () => ({
    default: {
        findOne: jest.fn(),
    }
}));

jest.unstable_mockModule('../../../../src/modules/inventory/inventoryItem.repository.js', () => ({
  inventoryItemRepository: {
    findBySupplyAndWarehouse: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    updateByName: jest.fn(),
    deleteByName: jest.fn(),
  },
}));

jest.unstable_mockModule('../../../../src/modules/warehouse/warehouse.model.js', () => ({
  Warehouse: {
    findById: jest.fn().mockReturnValue({
      lean: jest.fn(),
    }),
  },
}));

jest.unstable_mockModule('../../../../src/modules/supply/supply.model.js', () => ({
  default: {
    findById: jest.fn().mockReturnValue({
      lean: jest.fn(),
    }),
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

const { inventoryItemService } = await import('../../../../src/modules/inventory/inventoryItem.service.js');
const { inventoryItemRepository } = await import('../../../../src/modules/inventory/inventoryItem.repository.js');
const { Warehouse } = await import('../../../../src/modules/warehouse/warehouse.model.js');
const Supply = (await import('../../../../src/modules/supply/supply.model.js')).default;
const MissionSupply = (await import('../../../../src/modules/missionSupplies/missionSupply.model.js')).default;
const { eventBus } = await import('../../../../src/utils/events.js');

describe('InventoryItemService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create inventory item with valid data and emit INVENTORY_ITEM_CREATED event', async () => {
      const inventoryData = {
        supplyID: 'supply-001',
        description: 'Medical supplies',
        quantity: 100,
        reservedQuantity: 20,
        unit: 'boxes',
        warehouse: 'wh-001',
        status: 'ACTIVE',
      };

      const mockWarehouse = { _id: 'wh-001', name: 'Main Warehouse' };
      const mockSupply = { _id: 'supply-001', name: 'Medical Kit' };
      const mockCreatedItem = {
        _id: 'inv-001',
        ...inventoryData,
        createdBy: 'manager-001',
        populate: jest.fn().mockResolvedValue({
          _id: 'inv-001',
          ...inventoryData,
          createdBy: 'manager-001',
        }),
      };

      Warehouse.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockWarehouse),
      });
      Supply.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockSupply),
      });
      inventoryItemRepository.create.mockResolvedValue(mockCreatedItem);

      const result = await inventoryItemService.create(inventoryData, 'manager-001');

      expect(Warehouse.findById).toHaveBeenCalledWith('wh-001');
      expect(Supply.findById).toHaveBeenCalledWith('supply-001');
      expect(inventoryItemRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        supplyID: 'supply-001',
        quantity: 100,
        warehouse: 'wh-001',
      }));
      expect(eventBus.emit).toHaveBeenCalledWith('INVENTORY_ITEM_CREATED', expect.objectContaining({
        inventoryItemId: 'inv-001',
        userId: 'manager-001',
      }));
      expect(result.message).toBe('Inventory item created successfully');
      expect(result.data).toBeDefined();
    });

    it('should use default ACTIVE status when status not provided', async () => {
      const inventoryData = {
        supplyID: 'supply-001',
        description: 'Medical supplies',
        quantity: 100,
        reservedQuantity: 0,
        unit: 'boxes',
        warehouse: 'wh-001',
      };

      const mockWarehouse = { _id: 'wh-001' };
      const mockSupply = { _id: 'supply-001' };

      Warehouse.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockWarehouse),
      });
      Supply.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockSupply),
      });
      inventoryItemRepository.create.mockResolvedValue({
        _id: 'inv-001',
        status: 'ACTIVE',
        populate: jest.fn().mockResolvedValue({ _id: 'inv-001', status: 'ACTIVE' }),
      });

      await inventoryItemService.create(inventoryData, 'manager-001');

      expect(inventoryItemRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        status: 'ACTIVE',
      }));
    });

    it('should throw error when warehouse is not found', async () => {
      const inventoryData = {
        supplyID: 'supply-001',
        warehouse: 'invalid-wh',
      };

      Warehouse.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      await expect(inventoryItemService.create(inventoryData, 'manager-001'))
        .rejects.toThrow('Warehouse not found');
    });

    it('should throw error when supply is not found', async () => {
      const inventoryData = {
        supplyID: 'invalid-supply',
        warehouse: 'wh-001',
      };

      const mockWarehouse = { _id: 'wh-001' };
      Warehouse.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockWarehouse),
      });
      Supply.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      await expect(inventoryItemService.create(inventoryData, 'manager-001'))
        .rejects.toThrow('Supply not found');
    });

    it('should handle creation without warehouse reference', async () => {
      const inventoryData = {
        supplyID: 'supply-001',
        description: 'Supplies',
        quantity: 50,
      };

      const mockSupply = { _id: 'supply-001' };
      Supply.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockSupply),
      });
      inventoryItemRepository.create.mockResolvedValue({
        _id: 'inv-001',
        populate: jest.fn().mockResolvedValue({ _id: 'inv-001' }),
      });

      const result = await inventoryItemService.create(inventoryData, 'manager-001');

      expect(result.data).toBeDefined();
      expect(Warehouse.findById).not.toHaveBeenCalled();
    });

    it('should handle creation without supply reference', async () => {
      const inventoryData = {
        description: 'Generic item',
        quantity: 50,
        warehouse: 'wh-001',
      };

      const mockWarehouse = { _id: 'wh-001' };
      Warehouse.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockWarehouse),
      });
      inventoryItemRepository.create.mockResolvedValue({
        _id: 'inv-001',
        populate: jest.fn().mockResolvedValue({ _id: 'inv-001' }),
      });

      const result = await inventoryItemService.create(inventoryData, 'manager-001');

      expect(result.data).toBeDefined();
      expect(Supply.findById).not.toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('should return inventory item when found', async () => {
      const mockItem = {
        _id: 'inv-001',
        description: 'Medical supplies',
        quantity: 100,
      };

      inventoryItemRepository.findById.mockResolvedValue(mockItem);

      const result = await inventoryItemService.getById('inv-001');

      expect(inventoryItemRepository.findById).toHaveBeenCalledWith('inv-001');
      expect(result).toEqual(mockItem);
    });

    it('should return null when inventory item not found', async () => {
      inventoryItemRepository.findById.mockResolvedValue(null);

      const result = await inventoryItemService.getById('invalid-id');

      expect(result).toBeNull();
    });
  });

  describe('list', () => {
    it('should return list with default pagination when not provided', async () => {
      const mockItems = [
        { _id: 'inv-001', description: 'Item 1' },
        { _id: 'inv-002', description: 'Item 2' },
      ];

      inventoryItemRepository.findAll.mockResolvedValue({
        data: mockItems,
        page: 1,
        limit: 10,
        total: 2,
      });

      const result = await inventoryItemService.list();

      expect(inventoryItemRepository.findAll).toHaveBeenCalledWith({}, { page: 1, limit: 10 });
      expect(result.data).toHaveLength(2);
    });

    it('should apply filter and custom pagination', async () => {
      const filter = { status: 'ACTIVE', warehouse: 'wh-001' };
      const pagination = { page: 2, limit: 20 };
      const mockItems = [{ _id: 'inv-001', status: 'ACTIVE' }];

      inventoryItemRepository.findAll.mockResolvedValue({
        data: mockItems,
        page: 2,
        limit: 20,
        total: 1,
      });

      const result = await inventoryItemService.list(filter, pagination);

      expect(inventoryItemRepository.findAll).toHaveBeenCalledWith(filter, pagination);
      expect(result.data).toEqual(mockItems);
    });

    it('should filter by quantity reserved', async () => {
      const filter = { reservedQuantity: { $gt: 10 } };
      const mockItems = [{ _id: 'inv-001', reservedQuantity: 50 }];

      inventoryItemRepository.findAll.mockResolvedValue({
        data: mockItems,
        page: 1,
        limit: 10,
        total: 1,
      });

      const result = await inventoryItemService.list(filter);

      expect(inventoryItemRepository.findAll).toHaveBeenCalledWith(filter, expect.any(Object));
      expect(result.data[0].reservedQuantity).toBe(50);
    });
  });

  describe('update', () => {
    it('should update inventory item and emit INVENTORY_ITEM_UPDATED event', async () => {
      const mockUpdatedItem = {
        _id: 'inv-001',
        description: 'Updated supplies',
        quantity: 150,
      };

      inventoryItemRepository.updateByName.mockResolvedValue(mockUpdatedItem);

      const result = await inventoryItemService.update('inv-001', { quantity: 150 });

      expect(inventoryItemRepository.updateByName).toHaveBeenCalledWith('inv-001', { quantity: 150 });
      expect(eventBus.emit).toHaveBeenCalledWith('INVENTORY_ITEM_UPDATED', expect.objectContaining({
        inventoryItemId: 'inv-001',
        updatedFields: { quantity: 150 },
      }));
      expect(result).toEqual(mockUpdatedItem);
    });

    it('should throw error when inventory item not found for update', async () => {
      inventoryItemRepository.updateByName.mockResolvedValue(null);

      await expect(inventoryItemService.update('invalid-id', { quantity: 150 }))
        .rejects.toThrow('Inventory item not found');
    });

    it('should not emit event when update fails', async () => {
      inventoryItemRepository.updateByName.mockResolvedValue(null);

      try {
        await inventoryItemService.update('invalid-id', { quantity: 150 });
      } catch (e) {
        // expected
      }

      expect(eventBus.emit).not.toHaveBeenCalled();
    });

    it('should allow partial updates', async () => {
      const mockUpdatedItem = {
        _id: 'inv-001',
        description: 'Medical supplies',
        quantity: 100,
        reservedQuantity: 35,
      };

      inventoryItemRepository.updateByName.mockResolvedValue(mockUpdatedItem);

      const result = await inventoryItemService.update('inv-001', { reservedQuantity: 35 });

      expect(inventoryItemRepository.updateByName).toHaveBeenCalledWith('inv-001', { reservedQuantity: 35 });
      expect(result.reservedQuantity).toBe(35);
    });
  });

  describe('remove', () => {
    it('should delete inventory item and emit INVENTORY_ITEM_DELETED event', async () => {
      const mockDeletedItem = {
        _id: 'inv-001',
        description: 'Medical supplies',
      };

      inventoryItemRepository.deleteByName.mockResolvedValue(mockDeletedItem);

      const result = await inventoryItemService.remove('inv-001');

      expect(inventoryItemRepository.deleteByName).toHaveBeenCalledWith('inv-001');
      expect(eventBus.emit).toHaveBeenCalledWith('INVENTORY_ITEM_DELETED', expect.objectContaining({
        inventoryItemId: 'inv-001',
      }));
      expect(result).toEqual(mockDeletedItem);
    });

    it('should not emit event when inventory item not found', async () => {
      inventoryItemRepository.deleteByName.mockResolvedValue(null);

      const result = await inventoryItemService.remove('invalid-id');

      expect(eventBus.emit).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe("allocateSupplyToMission", () => {
    it("should allocate supply successfully and use mongoose transaction", async () => {
      const mockMissionSupply = {
        _id: "ms-1",
        status: "REQUESTED",
        save: jest.fn().mockResolvedValue()
      };

      MissionSupply.findOne.mockReturnValue({
        session: jest.fn().mockResolvedValue(mockMissionSupply)
      });

      const mockInventoryItem = {
        _id: "inv-1",
        quantity: 200,
        reservedQuantity: 50,
        save: jest.fn().mockResolvedValue()
      };

      inventoryItemRepository.findBySupplyAndWarehouse.mockResolvedValue(mockInventoryItem);

      const result = await inventoryItemService.allocateSupplyToMission("m-1", "sup-1", "w-1", 100, "user-1", "note");

      expect(mockMissionSupply.warehouseId).toBe("w-1");
      expect(mockMissionSupply.allocatedQty).toBe(100);
      expect(mockMissionSupply.status).toBe("ALLOCATED");
      expect(mockInventoryItem.reservedQuantity).toBe(150);
      expect(mockSession.commitTransaction).toHaveBeenCalled();
      expect(result).toBe(mockMissionSupply);
    });

    it("should fail if there is not enough available inventory", async () => {
      MissionSupply.findOne.mockReturnValue({
        session: jest.fn().mockResolvedValue({
          _id: "ms-1",
          status: "REQUESTED",
        })
      });

      inventoryItemRepository.findBySupplyAndWarehouse.mockResolvedValue({
        _id: "inv-1",
        quantity: 100,
        reservedQuantity: 50,
      });

      await expect(
        inventoryItemService.allocateSupplyToMission("m-1", "sup-1", "w-1", 60, "user-1", "note")
      ).rejects.toThrow("Not enough available stock in this warehouse. Available: 50");
      
      expect(mockSession.abortTransaction).toHaveBeenCalled();
    });
  });
});

