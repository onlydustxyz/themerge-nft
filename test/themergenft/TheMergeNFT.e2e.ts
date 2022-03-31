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

    async function claimTokensAs(address: SignerWithAddress, tokens: string[], node: string) {
      const merkleProof = whitelistMerkleTree.getHexProof(node);
      await theMergeNFT.connect(address).whitelistMint(tokens, merkleProof);
    }

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
      await claimTokensAs(
        this.signers.whitelistedAddress1,
        claims[this.signers.whitelistedAddress1.address],
        leafNodes[0],
      );

      // Check that all NFTs have been claimed
      expect(await theMergeNFT.balanceOf(this.signers.whitelistedAddress1.address, TYPE_ACTIVE_WALLET)).to.be.equal(1);
      expect(await theMergeNFT.balanceOf(this.signers.whitelistedAddress1.address, TYPE_SLASHED_VALIDATOR)).to.be.equal(
        1,
      );
      expect(await theMergeNFT.balanceOf(this.signers.whitelistedAddress1.address, TYPE_VALIDATOR)).to.be.equal(1);
    });

    it("does not let an address claim the tokens twice", async function () {
      await expect(
        claimTokensAs(this.signers.whitelistedAddress1, claims[this.signers.whitelistedAddress1.address], leafNodes[0]),
      ).to.be.revertedWith("Address has already claimed.");
    });

    it("does not let an address claim tokens with a proof not related to their address", async function () {
      await expect(
        claimTokensAs(this.signers.whitelistedAddress2, claims[this.signers.whitelistedAddress2.address], leafNodes[2]),
      ).to.be.revertedWith("Invalid proof.");
    });

    it("does not let an address claim token types they are not whitelisted for", async function () {
      await expect(claimTokensAs(this.signers.whitelistedAddress3, [TYPE_VALIDATOR], leafNodes[2])).to.be.revertedWith(
        "Invalid proof.",
      );
    });

    it("does not let an address transfer their token", async function () {
      await expect(
        theMergeNFT
          .connect(this.signers.whitelistedAddress1)
          .safeTransferFrom(
            this.signers.whitelistedAddress1.address,
            this.signers.whitelistedAddress2.address,
            TYPE_ACTIVE_WALLET,
            1,
            [],
          ),
      ).to.be.revertedWith("Transfers are not allowed");
    });

    it("gives all the powers of 2 of a given number", async function () {
      {
        const decomposition = await theMergeNFT.decomposeUint(1236);
        expect(decomposition.map(bigNumber => bigNumber.toNumber())).to.deep.equal([2, 4, 6, 7, 10]);
      }
      {
        const decomposition = await theMergeNFT.decomposeUint(0);
        expect(decomposition).to.deep.equal([]);
      }
    });
  });
});

function generateLeafData(address: string, nftTypes: string[]): string {
  return ethers.utils.hexConcat([address, ...nftTypes]);
}
