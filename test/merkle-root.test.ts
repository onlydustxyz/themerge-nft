import { expect } from "chai";
import { generateWhitelistMerkleTree, getMerkleRoot } from "../tasks/merkle-root";
import { readWhitelist, WhiteList } from "../tasks/whitelist-reader";

describe("The merkle root computation", () => {
  it("generates a merkle tree from a simple whitelist", async () => {
    const whitelist: WhiteList = [{ address: "0x2c9758BDe2DBc7F6a259a5826a85761FcE322708", packedTypes: 127 }];
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
    expect(merkleRoot).to.equal("0xe1950381f472e73ce3626ab355b2619c65385a8b14806c13bfd622e5ef0fe66c");
  });
});
