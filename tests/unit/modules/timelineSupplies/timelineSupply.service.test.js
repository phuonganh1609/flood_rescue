import { describe, it, expect, beforeEach, jest } from "@jest/globals";

const mockSession = {
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  abortTransaction: jest.fn(),
  endSession: jest.fn(),
};

jest.unstable_mockModule("mongoose", () => ({
  default: {
    startSession: jest.fn().mockResolvedValue(mockSession),
    Schema: { Types: { ObjectId: String } },
    model: jest.fn()
  }
}));

jest.unstable_mockModule("../../../../src/modules/timelineSupplies/timelineSupply.model.js", () => {
    return {
        default: {
            findOne: jest.fn(),
            create: jest.fn(),
            countDocuments: jest.fn(),
        }
    }
});

jest.unstable_mockModule("../../../../src/modules/missionSupplies/missionSupply.model.js", () => {
    return {
        default: {
            findById: jest.fn(),
            findOne: jest.fn(),
            insertMany: jest.fn(),
        }
    }
});

jest.unstable_mockModule("../../../../src/modules/inventory/inventoryItem.model.js", () => {
    return {
        InventoryItem: {
            findById: jest.fn(),
        }
    }
});

jest.unstable_mockModule("../../../../src/modules/supply/supply.model.js", () => {
    return {
        default: {
            findById: jest.fn(),
            find: jest.fn(),
        }
    }
});

jest.unstable_mockModule("../../../../src/modules/timelines/timeline.model.js", () => {
    return {
        default: {
            findById: jest.fn(),
        }
    }
});

jest.unstable_mockModule("../../../../src/modules/teamRequests/teamRequest.model.js", () => {
    return {
        default: {
            find: jest.fn(),
        }
    }
});

const { timelineSupplyService } = await import("../../../../src/modules/timelineSupplies/timelineSupply.service.js");
const TimelineSupply = (await import("../../../../src/modules/timelineSupplies/timelineSupply.model.js")).default;
const MissionSupply = (await import("../../../../src/modules/missionSupplies/missionSupply.model.js")).default;
const { InventoryItem } = await import("../../../../src/modules/inventory/inventoryItem.model.js");
const Timeline = (await import("../../../../src/modules/timelines/timeline.model.js")).default;
const Supply = (await import("../../../../src/modules/supply/supply.model.js")).default;
const TeamRequest = (await import("../../../../src/modules/teamRequests/teamRequest.model.js")).default;

describe("TimelineSupplyService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("claimSupply", () => {
    it("should successfully claim supply and update inventory and missionSupply", async () => {
      // Mock db records with .session() chaining
      Timeline.findById.mockReturnValue({
        session: jest.fn().mockResolvedValue({ _id: "tl-1" })
      });

      const mockMissionSupply = {
        _id: "ms-1",
        status: "ALLOCATED",
        allocatedQty: 100,
        claimedQty: 20,
        inventoryItemId: "inv-1",
        supplyId: "sup-1",
        save: jest.fn().mockResolvedValue()
      };

      MissionSupply.findById.mockReturnValue({
        session: jest.fn().mockResolvedValue(mockMissionSupply)
      });

      TimelineSupply.findOne.mockReturnValue({
        session: jest.fn().mockResolvedValue(null) // Not claimed before
      });

      TimelineSupply.create.mockResolvedValue([{
        _id: "ts-1",
        carriedQty: 30
      }]);

      const mockInventoryItem = {
        _id: "inv-1",
        quantity: 200,
        reservedQuantity: 100,
        save: jest.fn().mockResolvedValue()
      };

      InventoryItem.findById.mockReturnValue({
        session: jest.fn().mockResolvedValue(mockInventoryItem)
      });

      const result = await timelineSupplyService.claimSupply("tl-1", "ms-1", 30);

      expect(TimelineSupply.create).toHaveBeenCalled();
      expect(mockMissionSupply.claimedQty).toBe(50); // 20 + 30
      expect(mockInventoryItem.quantity).toBe(170); // 200 - 30
      expect(mockInventoryItem.reservedQuantity).toBe(70); // 100 - 30
      expect(mockSession.commitTransaction).toHaveBeenCalled();
      expect(result._id).toBe("ts-1");
    });

    it("should throw error if trying to claim more than allocated", async () => {
      Timeline.findById.mockReturnValue({
        session: jest.fn().mockResolvedValue({ _id: "tl-1" })
      });

      MissionSupply.findById.mockReturnValue({
        session: jest.fn().mockResolvedValue({
          _id: "ms-1",
          status: "ALLOCATED",
          allocatedQty: 50,
          claimedQty: 40,
        })
      });

      TimelineSupply.findOne.mockReturnValue({
        session: jest.fn().mockResolvedValue(null)
      });

      await expect(timelineSupplyService.claimSupply("tl-1", "ms-1", 20)).rejects.toThrow("Cannot claim more than available");
      expect(mockSession.abortTransaction).toHaveBeenCalled();
    });
  });

  describe("returnSupply", () => {
    it("should correctly auto-calculate return quantity from distributed supply", async () => {
      const mockTimelineSupply = {
        _id: "ts-1",
        carriedQty: 50,
        supplyId: "sup-1",
        returnedAt: null,
        save: jest.fn().mockResolvedValue()
      };

      TimelineSupply.findOne.mockReturnValue({
        session: jest.fn().mockResolvedValue(mockTimelineSupply)
      });

      Supply.findById.mockReturnValue({
        session: jest.fn().mockResolvedValue({ name: "Water" })
      });

      Timeline.findById.mockReturnValue({
        session: jest.fn().mockResolvedValue({ missionId: "m-1", teamId: "tm-1" })
      });

      TeamRequest.find.mockReturnValue({
        session: jest.fn().mockResolvedValue([
          { suppliesDeliveredTotal: [{ name: "Water", deliveredQty: 10 }] },
          { suppliesDeliveredTotal: [{ name: "Water", deliveredQty: 25 }, { name: "Food", deliveredQty: 5 }] }
        ])
      });

      const mockMissionSupply = {
        _id: "ms-1",
        inventoryItemId: "inv-1",
        save: jest.fn().mockResolvedValue()
      };
      
      MissionSupply.findById.mockReturnValue({
        session: jest.fn().mockResolvedValue(mockMissionSupply)
      });

      const mockInventoryItem = {
        _id: "inv-1",
        quantity: 100,
        save: jest.fn().mockResolvedValue()
      };

      InventoryItem.findById.mockReturnValue({
        session: jest.fn().mockResolvedValue(mockInventoryItem)
      });

      TimelineSupply.countDocuments.mockReturnValue({
        session: jest.fn().mockResolvedValue(1)
      });

      const result = await timelineSupplyService.returnSupply("tl-1", "ms-1");

      // Carried 50. Distributed 10 + 25 = 35. Return 15.
      expect(result.totalDistributed).toBe(35);
      expect(mockTimelineSupply.returnedQty).toBe(15);
      expect(mockInventoryItem.quantity).toBe(115); // 100 + 15
      expect(mockMissionSupply.status).toBe("RETURNED"); // since total == returned count
      expect(mockSession.commitTransaction).toHaveBeenCalled();
    });
  });
});
