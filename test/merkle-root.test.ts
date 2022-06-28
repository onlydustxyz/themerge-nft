import { expect } from "chai";
import {
  generateWhitelistMerkleTree,
  getMerkleRoot,
  readWhitelist,
  unpackNftTypes,
  WhiteList,
} from "../tasks/merkle-root";

describe("The merkle root computation", () => {
  it("decomposes the packed NFT types from the whitelist", async () => {
    const packedNftTypes = parseInt("0xf", 16);
    const nftTypes = unpackNftTypes(packedNftTypes);

    expect(nftTypes).to.deep.equal([0, 1, 2, 3]);
  });

  it("generates a merkle tree from a simple whitelist", async () => {
    const whitelist: WhiteList = [{ address: "0x2c9758BDe2DBc7F6a259a5826a85761FcE322708", packedTypes: 0xf }];
    const merkleTree = generateWhitelistMerkleTree(whitelist);

    expect(merkleTree.getDepth()).to.equal(0);
    expect(merkleTree.getLeafCount()).to.equal(1);
  });

  it("generates a merkle tree from a complex whitlist", async () => {
    const fixtureWhitelistPath = "test/test-whitelist.json";
    const whitelist = await readWhitelist(fixtureWhitelistPath);
    const merkleTree = generateWhitelistMerkleTree(whitelist);

    expect(merkleTree.getDepth()).to.equal(2);
    expect(merkleTree.getLeafCount()).to.equal(3);

    const merkleRoot = await getMerkleRoot(fixtureWhitelistPath);
    expect(merkleRoot).to.equal("0x1231ef97f498d2021769f00cd842695f991d0144d798c8d7c3e11c860f4a68cf");
  });
});
