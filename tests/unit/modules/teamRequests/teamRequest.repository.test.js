import { describe, it, expect } from "@jest/globals";

import { mergeSupplies } from "../../../../src/modules/teamRequests/teamRequest.repository.js";

describe("teamRequest.repository helpers", () => {
  it("should merge supplies by name additively", () => {
    const result = mergeSupplies(
      [{ name: "Water", deliveredQty: 2 }],
      [
        { name: "Water", deliveredQty: 3 },
        { name: "Rice", deliveredQty: 1 },
      ],
    );

    expect(result).toEqual([
      { name: "Water", deliveredQty: 5 },
      { name: "Rice", deliveredQty: 1 },
    ]);
  });
});