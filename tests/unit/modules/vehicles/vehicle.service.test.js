import { describe, it, expect, beforeEach, jest } from '@jest/globals';

jest.unstable_mockModule('../../../../src/modules/vehicles/vehicle.repository.js', () => ({
  vehicleRepository: {
    licensePlateExists: jest.fn(),
    createVehicle: jest.fn(),
    findVehicleById: jest.fn(),
    findAllVehicles: jest.fn(),
    findVehiclesByType: jest.fn(),
    findVehiclesByStatus: jest.fn(),
    findVehiclesByTeam: jest.fn(),
    getVehiclesNeedingMaintenance: jest.fn(),
    countByStatus: jest.fn(),
    updateVehicle: jest.fn(),
    deleteVehicle: jest.fn(),
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

const { vehicleService } = await import('../../../../src/modules/vehicles/vehicle.service.js');
const { vehicleRepository } = await import('../../../../src/modules/vehicles/vehicle.repository.js');
const { eventBus } = await import('../../../../src/utils/events.js');

describe('VehicleService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createVehicle', () => {
    it('should create vehicle with valid data and emit VEHICLE_CREATED event', async () => {
      const vehicleData = {
        licensePlate: 'ABC-1234',
        type: 'Ambulance',
        brand: 'Toyota',
        model: 'Hiace',
        year: 2023,
        color: 'White',
        fuelType: 'Gasoline',
        capacity: 4,
        capacityUnit: 'persons',
        status: 'ACTIVE',
        description: 'Emergency medical vehicle',
      };

      const mockCreatedVehicle = {
        _id: 'vehicle-001',
        ...vehicleData,
        assignedTo: null,
        isActive: true,
        createdBy: 'manager-001',
      };

      vehicleRepository.licensePlateExists.mockResolvedValue(false);
      vehicleRepository.createVehicle.mockResolvedValue(mockCreatedVehicle);

      const result = await vehicleService.createVehicle(vehicleData, 'manager-001');

      expect(vehicleRepository.licensePlateExists).toHaveBeenCalledWith('ABC-1234');
      expect(vehicleRepository.createVehicle).toHaveBeenCalledWith(expect.objectContaining({
        licensePlate: 'ABC-1234',
        type: 'Ambulance',
        status: 'ACTIVE',
      }));
      expect(eventBus.emit).toHaveBeenCalledWith('VEHICLE_CREATED', expect.objectContaining({
        vehicleId: 'vehicle-001',
        licensePlate: 'ABC-1234',
        userId: 'manager-001',
      }));
      expect(result.message).toBe('Vehicle created successfully');
    });

    it('should throw error when license plate already exists', async () => {
      const vehicleData = {
        licensePlate: 'ABC-1234',
        type: 'Ambulance',
      };

      vehicleRepository.licensePlateExists.mockResolvedValue(true);

      await expect(vehicleService.createVehicle(vehicleData, 'manager-001'))
        .rejects.toThrow('License plate already exists');
    });

    it('should set default status to ACTIVE when not provided', async () => {
      const vehicleData = {
        licensePlate: 'ABC-1234',
        type: 'Ambulance',
      };

      const mockVehicle = {
        _id: 'vehicle-001',
        ...vehicleData,
        status: 'ACTIVE',
        isActive: true,
      };

      vehicleRepository.licensePlateExists.mockResolvedValue(false);
      vehicleRepository.createVehicle.mockResolvedValue(mockVehicle);

      await vehicleService.createVehicle(vehicleData, 'manager-001');

      expect(vehicleRepository.createVehicle).toHaveBeenCalledWith(expect.objectContaining({
        status: 'ACTIVE',
      }));
    });

    it('should not emit event if license plate check fails', async () => {
      const vehicleData = {
        licensePlate: 'ABC-1234',
        type: 'Ambulance',
      };

      vehicleRepository.licensePlateExists.mockResolvedValue(true);

      try {
        await vehicleService.createVehicle(vehicleData, 'manager-001');
      } catch (e) {
        // expected
      }

      expect(eventBus.emit).not.toHaveBeenCalled();
    });
  });

  describe('getVehicleById', () => {
    it('should return vehicle when found', async () => {
      const mockVehicle = {
        _id: 'vehicle-001',
        licensePlate: 'ABC-1234',
        type: 'Ambulance',
      };

      vehicleRepository.findVehicleById.mockResolvedValue(mockVehicle);

      const result = await vehicleService.getVehicleById('vehicle-001');

      expect(vehicleRepository.findVehicleById).toHaveBeenCalledWith('vehicle-001');
      expect(result).toEqual(mockVehicle);
    });

    it('should return null when vehicle not found', async () => {
      vehicleRepository.findVehicleById.mockResolvedValue(null);

      const result = await vehicleService.getVehicleById('invalid-id');

      expect(result).toBeNull();
    });
  });

  describe('getAllVehicles', () => {
    it('should return all vehicles with default pagination', async () => {
      const mockVehicles = [
        { _id: 'vehicle-001', licensePlate: 'ABC-1234' },
        { _id: 'vehicle-002', licensePlate: 'XYZ-5678' },
      ];

      vehicleRepository.findAllVehicles.mockResolvedValue({
        data: mockVehicles,
        page: 1,
        limit: 10,
        total: 2,
      });

      const result = await vehicleService.getAllVehicles();

      expect(vehicleRepository.findAllVehicles).toHaveBeenCalledWith({}, { page: 1, limit: 10 });
      expect(result.data).toHaveLength(2);
    });

    it('should apply filter and custom pagination', async () => {
      const filter = { status: 'ACTIVE' };
      const pagination = { page: 2, limit: 20 };
      const mockVehicles = [{ _id: 'vehicle-001', status: 'ACTIVE' }];

      vehicleRepository.findAllVehicles.mockResolvedValue({
        data: mockVehicles,
        page: 2,
        limit: 20,
        total: 1,
      });

      const result = await vehicleService.getAllVehicles(filter, pagination);

      expect(vehicleRepository.findAllVehicles).toHaveBeenCalledWith(filter, pagination);
      expect(result.data[0].status).toBe('ACTIVE');
    });
  });

  describe('getVehiclesByType', () => {
    it('should return vehicles filtered by type with default pagination', async () => {
      const mockVehicles = [
        { _id: 'vehicle-001', type: 'Ambulance' },
        { _id: 'vehicle-002', type: 'Ambulance' },
      ];

      vehicleRepository.findVehiclesByType.mockResolvedValue({
        data: mockVehicles,
        page: 1,
        limit: 10,
        total: 2,
      });

      const result = await vehicleService.getVehiclesByType('Ambulance');

      expect(vehicleRepository.findVehiclesByType).toHaveBeenCalledWith('Ambulance', { page: 1, limit: 10 });
      expect(result.data).toHaveLength(2);
    });
  });

  describe('getVehiclesByStatus', () => {
    it('should return vehicles filtered by status', async () => {
      const mockVehicles = [{ _id: 'vehicle-001', status: 'MAINTENANCE' }];

      vehicleRepository.findVehiclesByStatus.mockResolvedValue({
        data: mockVehicles,
        page: 1,
        limit: 10,
        total: 1,
      });

      const result = await vehicleService.getVehiclesByStatus('MAINTENANCE');

      expect(vehicleRepository.findVehiclesByStatus).toHaveBeenCalledWith('MAINTENANCE', { page: 1, limit: 10 });
      expect(result.data[0].status).toBe('MAINTENANCE');
    });
  });

  describe('getVehicleStats', () => {
    it('should calculate vehicle statistics by status', async () => {
      vehicleRepository.countByStatus
        .mockResolvedValueOnce(10) // ACTIVE
        .mockResolvedValueOnce(2)  // MAINTENANCE
        .mockResolvedValueOnce(1)  // OUT_OF_SERVICE
        .mockResolvedValueOnce(0); // INACTIVE

      const result = await vehicleService.getVehicleStats();

      expect(vehicleRepository.countByStatus).toHaveBeenCalledTimes(4);
      expect(result).toEqual({
        activeCount: 10,
        maintenanceCount: 2,
        outOfServiceCount: 1,
        inactiveCount: 0,
        total: 13,
      });
    });
  });

  describe('updateVehicle', () => {
    it('should update vehicle and emit VEHICLE_UPDATED event', async () => {
      const mockExistingVehicle = {
        _id: 'vehicle-001',
        licensePlate: 'ABC-1234',
        status: 'ACTIVE',
      };

      const mockUpdatedVehicle = {
        _id: 'vehicle-001',
        licensePlate: 'ABC-1234',
        status: 'MAINTENANCE',
      };

      vehicleRepository.findVehicleById.mockResolvedValue(mockExistingVehicle);
      vehicleRepository.updateVehicle.mockResolvedValue(mockUpdatedVehicle);

      const result = await vehicleService.updateVehicle('vehicle-001', { status: 'MAINTENANCE' }, 'manager-001');

      expect(vehicleRepository.findVehicleById).toHaveBeenCalledWith('vehicle-001');
      expect(vehicleRepository.updateVehicle).toHaveBeenCalledWith('vehicle-001', expect.objectContaining({
        status: 'MAINTENANCE',
      }));
      expect(eventBus.emit).toHaveBeenCalledWith('VEHICLE_UPDATED', expect.objectContaining({
        vehicleId: 'vehicle-001',
        licensePlate: 'ABC-1234',
        userId: 'manager-001',
      }));
      expect(result.message).toBe('Vehicle updated successfully');
    });

    it('should throw error when vehicle not found', async () => {
      vehicleRepository.findVehicleById.mockResolvedValue(null);

      await expect(vehicleService.updateVehicle('invalid-id', { status: 'MAINTENANCE' }, 'manager-001'))
        .rejects.toThrow('Vehicle not found');
    });

    it('should check license plate availability when updating license plate', async () => {
      const mockExistingVehicle = {
        _id: 'vehicle-001',
        licensePlate: 'ABC-1234',
      };

      vehicleRepository.findVehicleById.mockResolvedValue(mockExistingVehicle);
      vehicleRepository.licensePlateExists.mockResolvedValue(true);

      await expect(vehicleService.updateVehicle(
        'vehicle-001',
        { licensePlate: 'XYZ-5678' },
        'manager-001'
      )).rejects.toThrow('License plate already exists');
    });

    it('should not check license plate when it is not being updated', async () => {
      const mockExistingVehicle = {
        _id: 'vehicle-001',
        licensePlate: 'ABC-1234',
      };

      const mockUpdatedVehicle = {
        _id: 'vehicle-001',
        licensePlate: 'ABC-1234',
        status: 'ACTIVE',
      };

      vehicleRepository.findVehicleById.mockResolvedValue(mockExistingVehicle);
      vehicleRepository.updateVehicle.mockResolvedValue(mockUpdatedVehicle);

      await vehicleService.updateVehicle('vehicle-001', { color: 'Blue' }, 'manager-001');

      expect(vehicleRepository.licensePlateExists).not.toHaveBeenCalled();
    });
  });

  describe('deleteVehicle', () => {
    it('should delete vehicle and emit VEHICLE_DELETED event', async () => {
      const mockVehicle = {
        _id: 'vehicle-001',
        licensePlate: 'ABC-1234',
      };

      vehicleRepository.findVehicleById.mockResolvedValue(mockVehicle);
      vehicleRepository.deleteVehicle.mockResolvedValue(mockVehicle);

      const result = await vehicleService.deleteVehicle('vehicle-001', 'manager-001');

      expect(vehicleRepository.findVehicleById).toHaveBeenCalledWith('vehicle-001');
      expect(vehicleRepository.deleteVehicle).toHaveBeenCalledWith('vehicle-001');
      expect(eventBus.emit).toHaveBeenCalledWith('VEHICLE_DELETED', expect.objectContaining({
        vehicleId: 'vehicle-001',
        licensePlate: 'ABC-1234',
        userId: 'manager-001',
      }));
      expect(result.message).toBe('Vehicle deleted successfully');
    });

    it('should throw error when vehicle not found', async () => {
      vehicleRepository.findVehicleById.mockResolvedValue(null);

      await expect(vehicleService.deleteVehicle('invalid-id', 'manager-001'))
        .rejects.toThrow('Vehicle not found');
    });
  });

  describe('assignVehicleToTeam', () => {
    it('should assign vehicle to team and emit VEHICLE_ASSIGNED event', async () => {
      const mockExistingVehicle = {
        _id: 'vehicle-001',
        licensePlate: 'ABC-1234',
        assignedTo: null,
      };

      const mockUpdatedVehicle = {
        _id: 'vehicle-001',
        licensePlate: 'ABC-1234',
        assignedTo: 'team-001',
      };

      vehicleRepository.findVehicleById.mockResolvedValue(mockExistingVehicle);
      vehicleRepository.updateVehicle.mockResolvedValue(mockUpdatedVehicle);

      const result = await vehicleService.assignVehicleToTeam('vehicle-001', 'team-001', 'manager-001');

      expect(vehicleRepository.findVehicleById).toHaveBeenCalledWith('vehicle-001');
      expect(vehicleRepository.updateVehicle).toHaveBeenCalledWith('vehicle-001', expect.objectContaining({
        assignedTo: 'team-001',
      }));
      expect(eventBus.emit).toHaveBeenCalledWith('VEHICLE_ASSIGNED', expect.objectContaining({
        vehicleId: 'vehicle-001',
        teamId: 'team-001',
        licensePlate: 'ABC-1234',
        userId: 'manager-001',
      }));
    });

    it('should throw error when vehicle not found for assignment', async () => {
      vehicleRepository.findVehicleById.mockResolvedValue(null);

      await expect(vehicleService.assignVehicleToTeam('invalid-id', 'team-001', 'manager-001'))
        .rejects.toThrow('Vehicle not found');
    });
  });
});
