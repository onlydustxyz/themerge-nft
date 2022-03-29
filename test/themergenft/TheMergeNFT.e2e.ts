import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { artifacts, ethers, waffle } from "hardhat";
import { Artifact } from "hardhat/types";
import { TheMergeNFT } from "../../src/types/TheMergeNFT";
import { MerkleTree } from "merkletreejs";
import {} from "keccak256";
import { keccak256 } from "ethers/lib/utils";
import { BigNumber } from "ethers";

async function deployContract(signer: SignerWithAddress, artifactName: string, args?: unknown[]) {
  const artifact: Artifact = await artifacts.readArtifact(artifactName);

  const contract = await waffle.deployContract(signer, artifact, args);
  return contract;
}

describe("TheMergeNFT", function () {
  const TYPE_ACTIVE_WALLET = ethers.utils.hexZeroPad(ethers.utils.hexlify(0), 32);
  const TYPE_VALIDATOR = ethers.utils.hexZeroPad(ethers.utils.hexlify(1), 32);
  const TYPE_SLASHED_VALIDATOR = ethers.utils.hexZeroPad(ethers.utils.hexlify(2), 32);
  const BASE_URI = "https://example/api/item/{id}.json";

  describe("in an end-to-end scenario", function () {
    let claims: { [address: string]: string[] };
    let whitelistMerkleRootHash: Buffer;
    let theMergeNFT: TheMergeNFT;
    let leafNodes: string[];
    let whitelistMerkleTree: MerkleTree;

    before(function () {
      // Declare the list of whitelisted addresses.
      claims = {
        [this.signers.whitelistedAddress1.address]: [TYPE_ACTIVE_WALLET, TYPE_VALIDATOR, TYPE_SLASHED_VALIDATOR],
        [this.signers.whitelistedAddress2.address]: [TYPE_ACTIVE_WALLET, TYPE_VALIDATOR, TYPE_SLASHED_VALIDATOR],
        [this.signers.whitelistedAddress3.address]: [TYPE_ACTIVE_WALLET],
        [this.signers.whitelistedAddress4.address]: [TYPE_VALIDATOR],
      };
      const leaves = [
        generateLeafData(this.signers.whitelistedAddress1.address, claims[this.signers.whitelistedAddress1.address]),
        generateLeafData(this.signers.whitelistedAddress2.address, claims[this.signers.whitelistedAddress2.address]),
        generateLeafData(this.signers.whitelistedAddress3.address, claims[this.signers.whitelistedAddress3.address]),
        generateLeafData(this.signers.whitelistedAddress4.address, claims[this.signers.whitelistedAddress4.address]),
      ];
      // Build leaf nodes from whitelisted addresses.
      leafNodes = leaves.map(leaf => keccak256(leaf));

      // Build the Merkle Tree.
      whitelistMerkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true });
      // Get the root hash of the Merkle Tree.
      whitelistMerkleRootHash = whitelistMerkleTree.getRoot();
    });
    it("can be deployed", async function () {
      // Deploy the contract.
      theMergeNFT = <TheMergeNFT>(
        await deployContract(this.signers.admin, "TheMergeNFT", [whitelistMerkleRootHash, BASE_URI])
      );
      expect(await theMergeNFT.merkleRoot()).to.be.equal(ethers.utils.hexlify(whitelistMerkleRootHash));
    });

    it("lets whitelisted address claim their tokens", async function () {
      // Address initially has no tokens
      expect(await theMergeNFT.balanceOf(this.signers.whitelistedAddress1.address, TYPE_ACTIVE_WALLET)).to.be.equal(0);
      expect(await theMergeNFT.balanceOf(this.signers.whitelistedAddress1.address, TYPE_SLASHED_VALIDATOR)).to.be.equal(
        0,
      );
      expect(await theMergeNFT.balanceOf(this.signers.whitelistedAddress1.address, TYPE_VALIDATOR)).to.be.equal(0);

      // Claim the tokens
      const claimingNode = leafNodes[0];
      const merkleProof = whitelistMerkleTree.getHexProof(claimingNode);
      await theMergeNFT
        .connect(this.signers.whitelistedAddress1)
        .whitelistMint(claims[this.signers.whitelistedAddress1.address], merkleProof);

      // Check that all NFTs have been claimed
      expect(await theMergeNFT.balanceOf(this.signers.whitelistedAddress1.address, TYPE_ACTIVE_WALLET)).to.be.equal(1);
      expect(await theMergeNFT.balanceOf(this.signers.whitelistedAddress1.address, TYPE_SLASHED_VALIDATOR)).to.be.equal(
        1,
      );
      expect(await theMergeNFT.balanceOf(this.signers.whitelistedAddress1.address, TYPE_VALIDATOR)).to.be.equal(1);
    });

    it("does not let an address claim the tokens twice", async function () {
      const claimingNode = leafNodes[0];
      const merkleProof = whitelistMerkleTree.getHexProof(claimingNode);
      await expect(
        theMergeNFT
          .connect(this.signers.whitelistedAddress1)
          .whitelistMint(claims[this.signers.whitelistedAddress1.address], merkleProof),
      ).to.be.revertedWith("Address has already claimed.");
    });

    it("does not let an address claim tokens with a proof not related to their address", async function () {
      const claimingNode = leafNodes[2];
      const merkleProof = whitelistMerkleTree.getHexProof(claimingNode);
      await expect(
        theMergeNFT
          .connect(this.signers.whitelistedAddress2)
          .whitelistMint(claims[this.signers.whitelistedAddress2.address], merkleProof),
      ).to.be.revertedWith("Invalid proof.");
    });

    it("does not let an address claim token types they are not whitelisted for", async function () {
      const claimingNode = leafNodes[2];
      const merkleProof = whitelistMerkleTree.getHexProof(claimingNode);
      await expect(
        theMergeNFT.connect(this.signers.whitelistedAddress3).whitelistMint([TYPE_VALIDATOR], merkleProof),
      ).to.be.revertedWith("Invalid proof.");
    });
  });
});

function generateLeafData(address: string, nftTypes: string[]): string {
  return ethers.utils.hexConcat([address, ...nftTypes]);
}
