import { expect } from "chai";
import { unpackNftTypes } from "../tasks/whitelist-reader";

describe("The whitelist reader", () => {
  it("decomposes the packed NFT types from the whitelist", async () => {
    const packedNftTypes = parseInt("0xf", 16);
    const nftTypes = unpackNftTypes(packedNftTypes);

    expect(nftTypes).to.deep.equal([0, 1, 2, 3]);
  });
});
