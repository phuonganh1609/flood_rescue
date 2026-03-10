import { describe, it, expect, beforeEach, jest } from '@jest/globals';

jest.unstable_mockModule('../../../../src/modules/supply/supply.repository.js', () => ({
  supplyRepository: {
    insertMany: jest.fn(),
    createSupply: jest.fn(),
    findSupplyByName: jest.fn(),
    findSupplyById: jest.fn(),
    findAllSupplies: jest.fn(),
    findAllSuppliesCategory: jest.fn(),
    getSuppliesByRequestStatus: jest.fn(),
    updateSupply: jest.fn(),
    deleteSupply: jest.fn(),
  },
}));

jest.unstable_mockModule('../../../../src/utils/events.js', () => ({
  eventBus: {
    emit: jest.fn(),
    on: jest.fn(),
  },
}));

// supply.service imports Supply model and authRepository - mock them to avoid DB connections
jest.unstable_mockModule('../../../../src/modules/supply/supply.model.js', () => ({
  default: {},
  SUPPLY_STATUS: { SUBMITTED: 'SUBMITTED', CLOSED: 'CLOSED', CANCELLED: 'CANCELLED' },
}));

jest.unstable_mockModule('../../../../src/modules/auth/auth.repository.js', () => ({
  authRepository: {},
}));

jest.unstable_mockModule('xlsx', () => ({
  default: { read: jest.fn(), utils: { sheet_to_json: jest.fn() } },
}));

const { supplyService } = await import('../../../../src/modules/supply/supply.service.js');
const { supplyRepository } = await import('../../../../src/modules/supply/supply.repository.js');
const { eventBus } = await import('../../../../src/utils/events.js');

describe('SupplyService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── importExcel ────────────────────────────────────────
  describe('importExcel', () => {
    it('should format rows and bulk-insert via repository', async () => {
      const rows = [
        { name: 'Rice', category: 'FOOD', unit: 'kg', unitWeight: 1 },
        { name: 'Water', unit: 'L', unitWeight: 0.5 },
      ];
      const insertedDocs = [
        { _id: 's1', name: 'Rice' },
        { _id: 's2', name: 'Water' },
      ];

      supplyRepository.insertMany.mockResolvedValue(insertedDocs);

      const result = await supplyService.importExcel(rows, 'manager-001');

      expect(supplyRepository.insertMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Rice', category: 'FOOD', status: 'SUBMITTED', createdBy: 'manager-001' }),
          expect.objectContaining({ name: 'Water', category: 'OTHER', status: 'SUBMITTED' }),
        ])
      );
      expect(result).toEqual(insertedDocs);
    });

    it('should default category to OTHER when not provided', async () => {
      const rows = [{ name: 'Item', unit: 'box', unitWeight: 2 }];
      supplyRepository.insertMany.mockResolvedValue([{ _id: 's1', name: 'Item' }]);

      await supplyService.importExcel(rows, 'manager-001');

      expect(supplyRepository.insertMany).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ category: 'OTHER' })])
      );
    });
  });

  // ─── createSupply ────────────────────────────────────────
  describe('createSupply', () => {
    it('should create supply and emit SUPPLY_CREATED event', async () => {
      const supplyData = {
        name: 'Emergency Food Pack',
        category: 'FOOD',
        unit: 'box',
        unitWeight: 5,
        description: 'Standard emergency ration packs',
      };

      const mockSupply = { _id: 'supply-001', ...supplyData, createdBy: 'manager-001' };
      supplyRepository.createSupply.mockResolvedValue(mockSupply);

      const result = await supplyService.createSupply(supplyData, 'manager-001');

      expect(supplyRepository.createSupply).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Emergency Food Pack',
          category: 'FOOD',
          isActive: true,
          createdBy: 'manager-001',
        })
      );
      expect(eventBus.emit).toHaveBeenCalledWith('SUPPLY_CREATED', {
        supplyId: 'supply-001',
        userId: 'manager-001',
      });
      expect(result.message).toBe('Supply created successfully');
      expect(result.data).toEqual(mockSupply);
    });

    it('should default isActive to true when not provided', async () => {
      const supplyData = { name: 'Water', category: 'WATER', unit: 'L', unitWeight: 1, description: 'Drinking water' };
      supplyRepository.createSupply.mockResolvedValue({ _id: 's1', ...supplyData });

      await supplyService.createSupply(supplyData, 'manager-001');

      expect(supplyRepository.createSupply).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: true })
      );
    });

    it('should respect explicit isActive=false', async () => {
      const supplyData = { name: 'Old Item', category: 'OTHER', unit: 'pcs', unitWeight: 1, description: 'Discontinued item', isActive: false };
      supplyRepository.createSupply.mockResolvedValue({ _id: 's1', ...supplyData });

      await supplyService.createSupply(supplyData, 'manager-001');

      expect(supplyRepository.createSupply).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false })
      );
    });
  });

  // ─── getSupplyByName ─────────────────────────────────────
  describe('getSupplyByName', () => {
    it('should return supply when found', async () => {
      const mockSupply = { _id: 'supply-001', name: 'Rice' };
      supplyRepository.findSupplyByName.mockResolvedValue(mockSupply);

      const result = await supplyService.getSupplyByName('Rice');

      expect(supplyRepository.findSupplyByName).toHaveBeenCalledWith('Rice');
      expect(result).toEqual(mockSupply);
    });

    it('should return null when supply not found', async () => {
      supplyRepository.findSupplyByName.mockResolvedValue(null);

      const result = await supplyService.getSupplyByName('Unknown');

      expect(result).toBeNull();
    });
  });

  // ─── getSupplyById ───────────────────────────────────────
  describe('getSupplyById', () => {
    it('should return supply when found by id', async () => {
      const mockSupply = { _id: 'supply-001', name: 'Rice' };
      supplyRepository.findSupplyById.mockResolvedValue(mockSupply);

      const result = await supplyService.getSupplyById('supply-001');

      expect(supplyRepository.findSupplyById).toHaveBeenCalledWith('supply-001');
      expect(result).toEqual(mockSupply);
    });

    it('should return null when not found', async () => {
      supplyRepository.findSupplyById.mockResolvedValue(null);
      const result = await supplyService.getSupplyById('bad-id');
      expect(result).toBeNull();
    });
  });

  // ─── getAllSupplies ──────────────────────────────────────
  describe('getAllSupplies', () => {
    it('should return paginated supplies with default pagination', async () => {
      const mockResult = {
        data: [{ _id: 's1', name: 'Rice' }, { _id: 's2', name: 'Water' }],
        total: 2, page: 1, limit: 10, totalPages: 1,
      };
      supplyRepository.findAllSupplies.mockResolvedValue(mockResult);

      const result = await supplyService.getAllSupplies();

      expect(supplyRepository.findAllSupplies).toHaveBeenCalledWith({}, { page: 1, limit: 10 });
      expect(result.data).toHaveLength(2);
    });

    it('should pass filter and custom pagination', async () => {
      const filter = { category: 'FOOD' };
      const pagination = { page: 2, limit: 5 };
      supplyRepository.findAllSupplies.mockResolvedValue({ data: [], total: 0, page: 2, limit: 5, totalPages: 0 });

      await supplyService.getAllSupplies(filter, pagination);

      expect(supplyRepository.findAllSupplies).toHaveBeenCalledWith(filter, pagination);
    });
  });

  // ─── getAllSuppliesByCategory ────────────────────────────
  describe('getAllSuppliesByCategory', () => {
    it('should delegate to repository with given filter', async () => {
      const filter = { category: 'MEDICAL' };
      supplyRepository.findAllSuppliesCategory.mockResolvedValue({
        data: [{ _id: 's1', category: 'MEDICAL' }],
        total: 1, page: 1, limit: 10, totalPages: 1,
      });

      const result = await supplyService.getAllSuppliesByCategory(filter);

      expect(supplyRepository.findAllSuppliesCategory).toHaveBeenCalledWith(filter, { page: 1, limit: 10 });
      expect(result.data[0].category).toBe('MEDICAL');
    });
  });

  // ─── getSupplyByRequestStatus ────────────────────────────
  describe('getSupplyByRequestStatus', () => {
    it('should return supplies matching request status', async () => {
      const mockSupplies = [{ _id: 's1', status: 'IN_PROGRESS' }];
      supplyRepository.getSuppliesByRequestStatus.mockResolvedValue(mockSupplies);

      const result = await supplyService.getSupplyByRequestStatus('IN_PROGRESS');

      expect(supplyRepository.getSuppliesByRequestStatus).toHaveBeenCalledWith('IN_PROGRESS');
      expect(result).toEqual(mockSupplies);
    });
  });

  // ─── updateSupply ────────────────────────────────────────
  describe('updateSupply', () => {
    it('should update supply and emit SUPPLY_UPDATED event', async () => {
      const mockUpdated = { _id: 'supply-001', name: 'Rice Updated', category: 'FOOD' };
      supplyRepository.updateSupply.mockResolvedValue(mockUpdated);

      const result = await supplyService.updateSupply('supply-001', { name: 'Rice Updated' }, 'manager-001');

      expect(supplyRepository.updateSupply).toHaveBeenCalledWith(
        'supply-001',
        expect.objectContaining({ name: 'Rice Updated', updatedAt: expect.any(Date) })
      );
      expect(eventBus.emit).toHaveBeenCalledWith('SUPPLY_UPDATED', {
        supplyId: 'supply-001',
        userId: 'manager-001',
      });
      expect(result.message).toBe('Supply updated successfully');
      expect(result.data).toEqual(mockUpdated);
    });

    it('should throw error when supply not found', async () => {
      supplyRepository.updateSupply.mockResolvedValue(null);

      await expect(supplyService.updateSupply('invalid-id', { name: 'X' }, 'manager-001'))
        .rejects.toThrow('Supply not found');
    });

    it('should not emit event when supply not found', async () => {
      supplyRepository.updateSupply.mockResolvedValue(null);

      try { await supplyService.updateSupply('invalid-id', {}, 'manager-001'); } catch {}

      expect(eventBus.emit).not.toHaveBeenCalled();
    });

    it('should merge updatedAt into update payload', async () => {
      const mockUpdated = { _id: 'supply-001', unit: 'kg' };
      supplyRepository.updateSupply.mockResolvedValue(mockUpdated);

      await supplyService.updateSupply('supply-001', { unit: 'kg' }, 'manager-001');

      expect(supplyRepository.updateSupply).toHaveBeenCalledWith(
        'supply-001',
        expect.objectContaining({ unit: 'kg', updatedAt: expect.any(Date) })
      );
    });
  });

  // ─── deleteSupply ────────────────────────────────────────
  describe('deleteSupply', () => {
    it('should delete supply and emit SUPPLY_DELETED event', async () => {
      const mockDeleted = { _id: 'supply-001', name: 'Rice' };
      supplyRepository.deleteSupply.mockResolvedValue(mockDeleted);

      const result = await supplyService.deleteSupply('supply-001', 'manager-001');

      expect(supplyRepository.deleteSupply).toHaveBeenCalledWith('supply-001');
      expect(eventBus.emit).toHaveBeenCalledWith('SUPPLY_DELETED', {
        supplyId: 'supply-001',
        userId: 'manager-001',
      });
      expect(result.message).toBe('Supply deleted successfully');
      expect(result.data).toEqual(mockDeleted);
    });

    it('should throw error when supply not found', async () => {
      supplyRepository.deleteSupply.mockResolvedValue(null);

      await expect(supplyService.deleteSupply('invalid-id', 'manager-001'))
        .rejects.toThrow('Supply not found');
    });

    it('should not emit event when supply not found', async () => {
      supplyRepository.deleteSupply.mockResolvedValue(null);

      try { await supplyService.deleteSupply('invalid-id', 'manager-001'); } catch {}

      expect(eventBus.emit).not.toHaveBeenCalled();
    });
  });
});
