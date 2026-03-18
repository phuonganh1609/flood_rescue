import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// ─── Mocks must come first in ESM ────────────────────────────────────────────

jest.unstable_mockModule('mongoose', () => ({
  default: {
    Types: {
      ObjectId: {
        isValid: jest.fn((id) => /^[0-9a-fA-F]{24}$/.test(id)),
      },
    },
  },
  Types: {
    ObjectId: {
      isValid: jest.fn((id) => /^[0-9a-fA-F]{24}$/.test(id)),
    },
  },
}));

jest.unstable_mockModule('../../../../src/modules/supply/supply.service.js', () => ({
  supplyService: {
    createSupply: jest.fn(),
    getSupplyByName: jest.fn(),
    getSupplyById: jest.fn(),
    getAllSupplies: jest.fn(),
    getAllSuppliesByCategory: jest.fn(),
    getSupplyByRequestStatus: jest.fn(),
    updateSupply: jest.fn(),
    deleteSupply: jest.fn(),
    importExcel: jest.fn(),
  },
}));

jest.unstable_mockModule('../../../../src/utils/response.js', () => ({
  default: {
    sendSuccess: jest.fn(),
    sendError: jest.fn(),
  },
}));

jest.unstable_mockModule('../../../../src/modules/supply/supply.validation.js', () => ({
  addSupplySchema: {
    validate: jest.fn((body) => {
      if (!body.name || !body.unit || !body.unitWeight) {
        return {
          error: {
            details: [{ path: ['name'], message: '"name" is required' }],
          },
        };
      }
      return { error: null, value: body };
    }),
  },
  updateSupplySchema: {
    validate: jest.fn((body) => ({ error: null, value: body })),
  },
}));

jest.unstable_mockModule('xlsx', () => ({
  default: {
    read: jest.fn(),
    utils: {
      sheet_to_json: jest.fn(),
    },
  },
}));

// supply.repository.js is imported by the controller — mock it to prevent DB connections
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

// ─── Dynamic imports ─────────────────────────────────────────────────────────
const supplyController = await import('../../../../src/modules/supply/supply.controller.js');
const { supplyService } = await import('../../../../src/modules/supply/supply.service.js');
const response = (await import('../../../../src/utils/response.js')).default;
const { addSupplySchema, updateSupplySchema } = await import('../../../../src/modules/supply/supply.validation.js');
const XLSX = (await import('xlsx')).default;

const VALID_OBJECT_ID = '507f1f77bcf86cd799439011';
const INVALID_OBJECT_ID = 'not-a-valid-id';

describe('SupplyController', () => {
  let mockRes;
  let mockReq;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    response.sendSuccess.mockReturnValue(mockRes);
    response.sendError.mockReturnValue(mockRes);
  });

  // ─── addSupply ───────────────────────────────────────────
  describe('addSupply', () => {
    it('should create supply and return 201 on valid body', async () => {
      mockReq = {
        body: { name: 'Rice', unit: 'kg', unitWeight: 1, description: 'Emergency rice packs', category: 'FOOD' },
        user: { id: 'manager-001' },
      };

      supplyService.createSupply.mockResolvedValue({
        message: 'Supply created successfully',
        data: { _id: VALID_OBJECT_ID, ...mockReq.body },
      });

      await supplyController.addSupply(mockReq, mockRes);

      expect(supplyService.createSupply).toHaveBeenCalledWith(mockReq.body, 'manager-001');
      expect(response.sendSuccess).toHaveBeenCalledWith(
        mockRes,
        expect.objectContaining({ statusCode: 201, message: 'Supply created successfully' })
      );
    });

    it('should return 400 when validation fails (missing required fields)', async () => {
      mockReq = { body: {}, user: { id: 'manager-001' } };

      await supplyController.addSupply(mockReq, mockRes);

      expect(response.sendError).toHaveBeenCalledWith(
        mockRes,
        expect.objectContaining({ statusCode: 400, message: 'Validation failed' })
      );
      expect(supplyService.createSupply).not.toHaveBeenCalled();
    });

    it('should handle service error', async () => {
      addSupplySchema.validate.mockReturnValueOnce({ error: null, value: mockReq?.body ?? {} });
      mockReq = {
        body: { name: 'Rice', unit: 'kg', unitWeight: 1, description: 'desc', category: 'FOOD' },
        user: { id: 'manager-001' },
      };
      supplyService.createSupply.mockRejectedValue(new Error('DB error'));

      await supplyController.addSupply(mockReq, mockRes);

      expect(response.sendError).toHaveBeenCalledWith(
        mockRes,
        expect.objectContaining({ message: 'DB error', statusCode: 400 })
      );
    });
  });

  // ─── getSupply ───────────────────────────────────────────
  describe('getSupply', () => {
    it('should return supply when found by name', async () => {
      mockReq = { params: { supplyName: 'Rice' } };
      const mockSupply = { _id: VALID_OBJECT_ID, name: 'Rice' };
      supplyService.getSupplyByName.mockResolvedValue(mockSupply);

      await supplyController.getSupply(mockReq, mockRes);

      expect(supplyService.getSupplyByName).toHaveBeenCalledWith('Rice');
      expect(response.sendSuccess).toHaveBeenCalledWith(mockRes, { data: mockSupply });
    });

    it('should return 404 when supply not found', async () => {
      mockReq = { params: { supplyName: 'Unknown' } };
      supplyService.getSupplyByName.mockResolvedValue(null);

      await supplyController.getSupply(mockReq, mockRes);

      expect(response.sendError).toHaveBeenCalledWith(
        mockRes,
        expect.objectContaining({ statusCode: 404, message: 'Supply not found' })
      );
    });

    it('should return 400 when supplyName is empty', async () => {
      mockReq = { params: { supplyName: '   ' } };

      await supplyController.getSupply(mockReq, mockRes);

      expect(response.sendError).toHaveBeenCalledWith(
        mockRes,
        expect.objectContaining({ statusCode: 400, message: 'Supply name is required' })
      );
      expect(supplyService.getSupplyByName).not.toHaveBeenCalled();
    });
  });

  // ─── getAllSupplies ──────────────────────────────────────
  describe('getAllSupplies', () => {
    it('should return all supplies with default pagination', async () => {
      mockReq = { query: {} };
      supplyService.getAllSupplies.mockResolvedValue({
        data: [{ _id: 's1' }, { _id: 's2' }],
        total: 2, page: 1, limit: 10, totalPages: 1,
      });

      await supplyController.getAllSupplies(mockReq, mockRes);

      expect(supplyService.getAllSupplies).toHaveBeenCalledWith({}, { page: 1, limit: 10 });
      expect(response.sendSuccess).toHaveBeenCalledWith(
        mockRes,
        expect.objectContaining({
          data: expect.arrayContaining([expect.objectContaining({ _id: 's1' })]),
        })
      );
    });

    it('should apply category filter', async () => {
      mockReq = { query: { category: 'FOOD' } };
      supplyService.getAllSupplies.mockResolvedValue({ data: [], total: 0, page: 1, limit: 10, totalPages: 0 });

      await supplyController.getAllSupplies(mockReq, mockRes);

      expect(supplyService.getAllSupplies).toHaveBeenCalledWith(
        { category: 'FOOD' },
        expect.any(Object)
      );
    });

    it('should apply isActive=true filter from string query', async () => {
      mockReq = { query: { isActive: 'true' } };
      supplyService.getAllSupplies.mockResolvedValue({ data: [], total: 0, page: 1, limit: 10, totalPages: 0 });

      await supplyController.getAllSupplies(mockReq, mockRes);

      expect(supplyService.getAllSupplies).toHaveBeenCalledWith(
        { isActive: true },
        expect.any(Object)
      );
    });

    it('should apply isActive=false filter from string query', async () => {
      mockReq = { query: { isActive: 'false' } };
      supplyService.getAllSupplies.mockResolvedValue({ data: [], total: 0, page: 1, limit: 10, totalPages: 0 });

      await supplyController.getAllSupplies(mockReq, mockRes);

      expect(supplyService.getAllSupplies).toHaveBeenCalledWith(
        { isActive: false },
        expect.any(Object)
      );
    });

    it('should apply name regex filter', async () => {
      mockReq = { query: { name: 'rice' } };
      supplyService.getAllSupplies.mockResolvedValue({ data: [], total: 0, page: 1, limit: 10, totalPages: 0 });

      await supplyController.getAllSupplies(mockReq, mockRes);

      const call = supplyService.getAllSupplies.mock.calls[0][0];
      expect(call.nameNormalized).toBeInstanceOf(RegExp);
      expect(call.nameNormalized.toString()).toContain('rice');
    });

    it('should use custom page and limit from query', async () => {
      mockReq = { query: { page: '3', limit: '5' } };
      supplyService.getAllSupplies.mockResolvedValue({ data: [], total: 0, page: 3, limit: 5, totalPages: 0 });

      await supplyController.getAllSupplies(mockReq, mockRes);

      expect(supplyService.getAllSupplies).toHaveBeenCalledWith({}, { page: 3, limit: 5 });
    });

    it('should separate pagination from data in meta', async () => {
      mockReq = { query: {} };
      supplyService.getAllSupplies.mockResolvedValue({
        data: [{ _id: 's1' }],
        total: 1, page: 1, limit: 10, totalPages: 1,
      });

      await supplyController.getAllSupplies(mockReq, mockRes);

      expect(response.sendSuccess).toHaveBeenCalledWith(
        mockRes,
        expect.objectContaining({
          data: [{ _id: 's1' }],
          meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
        })
      );
    });
  });

  // ─── getSupplyByRequestStatus ────────────────────────────
  describe('getSupplyByRequestStatus', () => {
    it('should return supplies for IN_PROGRESS status', async () => {
      mockReq = { params: { status: 'IN_PROGRESS' } };
      const mockData = [{ _id: 's1' }];
      supplyService.getSupplyByRequestStatus.mockResolvedValue(mockData);

      await supplyController.getSupplyByRequestStatus(mockReq, mockRes);

      expect(supplyService.getSupplyByRequestStatus).toHaveBeenCalledWith('IN_PROGRESS');
      expect(response.sendSuccess).toHaveBeenCalledWith(mockRes, { data: mockData });
    });

    it('should return 400 for invalid status', async () => {
      mockReq = { params: { status: 'INVALID_STATUS' } };

      await supplyController.getSupplyByRequestStatus(mockReq, mockRes);

      expect(response.sendError).toHaveBeenCalledWith(
        mockRes,
        expect.objectContaining({ statusCode: 400 })
      );
      expect(supplyService.getSupplyByRequestStatus).not.toHaveBeenCalled();
    });

    it('should return 400 when status is missing (undefined)', async () => {
      mockReq = { params: {} };

      await supplyController.getSupplyByRequestStatus(mockReq, mockRes);

      expect(response.sendError).toHaveBeenCalledWith(
        mockRes,
        expect.objectContaining({ statusCode: 400, message: 'status is required' })
      );
    });
  });

  // ─── updateSupply ────────────────────────────────────────
  describe('updateSupply', () => {
    it('should update supply with valid ObjectId and body', async () => {
      mockReq = {
        params: { supplyId: VALID_OBJECT_ID },
        body: { name: 'Rice Updated' },
        user: { id: 'manager-001' },
      };

      supplyService.updateSupply.mockResolvedValue({
        message: 'Supply updated successfully',
        data: { _id: VALID_OBJECT_ID, name: 'Rice Updated' },
      });

      await supplyController.updateSupply(mockReq, mockRes);

      expect(supplyService.updateSupply).toHaveBeenCalledWith(
        VALID_OBJECT_ID,
        { name: 'Rice Updated' },
        'manager-001'
      );
      expect(response.sendSuccess).toHaveBeenCalledWith(
        mockRes,
        expect.objectContaining({ message: 'Supply updated successfully' })
      );
    });

    it('should return 400 for invalid ObjectId', async () => {
      mockReq = {
        params: { supplyId: INVALID_OBJECT_ID },
        body: { name: 'X' },
        user: { id: 'manager-001' },
      };

      await supplyController.updateSupply(mockReq, mockRes);

      expect(response.sendError).toHaveBeenCalledWith(
        mockRes,
        expect.objectContaining({ statusCode: 400, message: 'Invalid supply ID' })
      );
      expect(supplyService.updateSupply).not.toHaveBeenCalled();
    });

    it('should return 400 when validation fails', async () => {
      updateSupplySchema.validate.mockReturnValueOnce({
        error: { details: [{ path: ['unitWeight'], message: '"unitWeight" must be positive' }] },
      });
      mockReq = {
        params: { supplyId: VALID_OBJECT_ID },
        body: { unitWeight: -1 },
        user: { id: 'manager-001' },
      };

      await supplyController.updateSupply(mockReq, mockRes);

      expect(response.sendError).toHaveBeenCalledWith(
        mockRes,
        expect.objectContaining({ statusCode: 400, message: 'Validation failed' })
      );
    });

    it('should handle service error (supply not found)', async () => {
      mockReq = {
        params: { supplyId: VALID_OBJECT_ID },
        body: { name: 'X' },
        user: { id: 'manager-001' },
      };
      supplyService.updateSupply.mockRejectedValue(new Error('Supply not found'));

      await supplyController.updateSupply(mockReq, mockRes);

      expect(response.sendError).toHaveBeenCalledWith(
        mockRes,
        expect.objectContaining({ message: 'Supply not found' })
      );
    });
  });

  // ─── deleteSupply ────────────────────────────────────────
  describe('deleteSupply', () => {
    it('should delete supply with valid ObjectId', async () => {
      mockReq = {
        params: { supplyId: VALID_OBJECT_ID },
        user: { id: 'manager-001' },
      };

      supplyService.deleteSupply.mockResolvedValue({
        message: 'Supply deleted successfully',
        data: { _id: VALID_OBJECT_ID },
      });

      await supplyController.deleteSupply(mockReq, mockRes);

      expect(supplyService.deleteSupply).toHaveBeenCalledWith(VALID_OBJECT_ID, 'manager-001');
      expect(response.sendSuccess).toHaveBeenCalledWith(
        mockRes,
        expect.objectContaining({ message: 'Supply deleted successfully' })
      );
    });

    it('should return 400 for invalid ObjectId', async () => {
      mockReq = { params: { supplyId: INVALID_OBJECT_ID }, user: { id: 'manager-001' } };

      await supplyController.deleteSupply(mockReq, mockRes);

      expect(response.sendError).toHaveBeenCalledWith(
        mockRes,
        expect.objectContaining({ statusCode: 400, message: 'Invalid supply ID' })
      );
      expect(supplyService.deleteSupply).not.toHaveBeenCalled();
    });

    it('should handle service error (supply not found)', async () => {
      mockReq = { params: { supplyId: VALID_OBJECT_ID }, user: { id: 'manager-001' } };
      supplyService.deleteSupply.mockRejectedValue(new Error('Supply not found'));

      await supplyController.deleteSupply(mockReq, mockRes);

      expect(response.sendError).toHaveBeenCalledWith(
        mockRes,
        expect.objectContaining({ message: 'Supply not found' })
      );
    });
  });

  // ─── importSuppliesFromExcel ─────────────────────────────
  describe('importSuppliesFromExcel', () => {
    it('should return 400 when no file is provided', async () => {
      mockReq = { user: { id: 'manager-001' } }; // no file

      await supplyController.importSuppliesFromExcel(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'File is required' });
    });

    it('should parse Excel and import supplies', async () => {
      const mockSheet = {};
      const mockWorkbook = { Sheets: { Sheet1: mockSheet }, SheetNames: ['Sheet1'] };
      const mockRows = [{ name: 'Rice', category: 'FOOD', unit: 'kg', unitWeight: 1 }];
      const mockResult = [{ _id: 's1', name: 'Rice' }];

      XLSX.read.mockReturnValue(mockWorkbook);
      XLSX.utils.sheet_to_json.mockReturnValue(mockRows);
      supplyService.importExcel.mockResolvedValue(mockResult);

      mockReq = {
        file: { buffer: Buffer.from('fake-excel') },
        user: { id: 'manager-001' },
      };

      await supplyController.importSuppliesFromExcel(mockReq, mockRes);

      expect(XLSX.read).toHaveBeenCalledWith(mockReq.file.buffer, { type: 'buffer' });
      expect(XLSX.utils.sheet_to_json).toHaveBeenCalledWith(mockSheet, expect.objectContaining({ range: 1 }));
      expect(supplyService.importExcel).toHaveBeenCalledWith(mockRows, 'manager-001');
      expect(response.sendSuccess).toHaveBeenCalledWith(
        mockRes,
        expect.objectContaining({ data: mockResult, message: 'Import supplies successfully' })
      );
    });

    it('should return 500 when XLSX parsing throws', async () => {
      XLSX.read.mockImplementation(() => { throw new Error('Invalid file'); });

      mockReq = {
        file: { buffer: Buffer.from('bad-data') },
        user: { id: 'manager-001' },
      };

      await supplyController.importSuppliesFromExcel(mockReq, mockRes);

      expect(response.sendError).toHaveBeenCalledWith(
        mockRes,
        expect.objectContaining({ statusCode: 500, message: 'Import Excel failed' })
      );
    });
  });
});
