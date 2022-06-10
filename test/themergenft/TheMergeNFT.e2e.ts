import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { artifacts, ethers, waffle } from "hardhat";
import { Artifact } from "hardhat/types";
import { TheMergeNFT } from "../../src/types/TheMergeNFT";
import { MerkleTree } from "merkletreejs";
import {} from "keccak256";
import { keccak256 } from "ethers/lib/utils";

async function deployContract(signer: SignerWithAddress, artifactName: string, args?: unknown[]) {
  const artifact: Artifact = await artifacts.readArtifact(artifactName);

  const contract = await waffle.deployContract(signer, artifact, args);
  return contract;
}

const TYPE_ONE_TRANSACTION = 0;
const TYPE_ONE_HUNDRED_TRANSACTIONS = 1;
const TYPE_DEPLOYMENT = 2;
const TYPE_TEN_DEPLOYMENTS = 3;
const TYPE_HUNDRED_DEPLOYMENTS = 4;
const TYPE_TEN_CALLS_TEN_CONTRACTS = 5;
const TYPE_VALIDATOR = 6;
const TYPE_SLASHED_VALIDATOR = 7;

const packTokenIds = (tokenIds: number[]): number => tokenIds.reduce((acc, tokenId) => acc + 2 ** tokenId, 0);

describe("TheMergeNFT", function () {
  const BASE_URI = "https://example/api/item/{id}.json";

  describe("in an end-to-end scenario", function () {
    let claims: { [address: string]: number };
    let whitelistMerkleRootHash: Buffer;
    let theMergeNFT: TheMergeNFT;
    let leafNodes: string[];
    let whitelistMerkleTree: MerkleTree;

    async function claimTokensAs(claimer: SignerWithAddress, packedTokenIds: number, node: string, for_?: string) {
      for_ = for_ || claimer.address;
      const merkleProof = whitelistMerkleTree.getHexProof(node);
      await theMergeNFT.connect(claimer).mint(packedTokenIds, merkleProof, for_);
    }

    before(function () {
      // Declare the list of whitelisted addresses.
      claims = {
        [this.signers.whitelistedAddress1.address]: packTokenIds([
          TYPE_ONE_TRANSACTION,
          TYPE_VALIDATOR,
          TYPE_SLASHED_VALIDATOR,
        ]),
        [this.signers.whitelistedAddress2.address]: packTokenIds([
          TYPE_ONE_TRANSACTION,
          TYPE_VALIDATOR,
          TYPE_SLASHED_VALIDATOR,
        ]),
        [this.signers.whitelistedAddress3.address]: packTokenIds([TYPE_ONE_TRANSACTION]),
        [this.signers.whitelistedAddress4.address]: packTokenIds([TYPE_VALIDATOR]),
        [this.signers.whitelistedAddress5.address]: packTokenIds([TYPE_VALIDATOR]),
        [this.signers.whitelistedAddress6.address]: packTokenIds([TYPE_VALIDATOR]),
      };
      const leaves = [
        generateLeafData(this.signers.whitelistedAddress1.address, claims[this.signers.whitelistedAddress1.address]),
        generateLeafData(this.signers.whitelistedAddress2.address, claims[this.signers.whitelistedAddress2.address]),
        generateLeafData(this.signers.whitelistedAddress3.address, claims[this.signers.whitelistedAddress3.address]),
        generateLeafData(this.signers.whitelistedAddress4.address, claims[this.signers.whitelistedAddress4.address]),
        generateLeafData(this.signers.whitelistedAddress5.address, claims[this.signers.whitelistedAddress5.address]),
        generateLeafData(this.signers.whitelistedAddress6.address, claims[this.signers.whitelistedAddress6.address]),
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

    it("does not let an address claim their token with an invalid proof", async function () {
      await expect(
        claimTokensAs(this.signers.whitelistedAddress1, claims[this.signers.whitelistedAddress1.address], "yolo"),
      ).to.be.revertedWith("Invalid proof.");
    });

    it("lets whitelisted address claim their tokens", async function () {
      // Address initially has no tokens
      expect(await theMergeNFT.balanceOf(this.signers.whitelistedAddress1.address, TYPE_ONE_TRANSACTION)).to.be.equal(
        0,
      );
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
      expect(await theMergeNFT.balanceOf(this.signers.whitelistedAddress1.address, TYPE_ONE_TRANSACTION)).to.be.equal(
        1,
      );
      expect(await theMergeNFT.balanceOf(this.signers.whitelistedAddress1.address, TYPE_SLASHED_VALIDATOR)).to.be.equal(
        1,
      );
      expect(await theMergeNFT.balanceOf(this.signers.whitelistedAddress1.address, TYPE_VALIDATOR)).to.be.equal(1);
    });

    it("does not let an address claim the tokens twice", async function () {
      await expect(
        claimTokensAs(this.signers.whitelistedAddress1, claims[this.signers.whitelistedAddress1.address], leafNodes[0]),
      ).to.be.revertedWith("Address has already claimed their tokens.");
    });

    it("does not let an address claim tokens with a proof not related to their address", async function () {
      await expect(
        claimTokensAs(this.signers.whitelistedAddress2, claims[this.signers.whitelistedAddress2.address], leafNodes[2]),
      ).to.be.revertedWith("Invalid proof.");
    });

    it("does not let an address claim token types they are not whitelisted for", async function () {
      await expect(
        claimTokensAs(this.signers.whitelistedAddress3, packTokenIds([TYPE_SLASHED_VALIDATOR]), leafNodes[2]),
      ).to.be.revertedWith("Invalid proof.");
    });

    it("does not let an address transfer their token", async function () {
      await expect(
        theMergeNFT
          .connect(this.signers.whitelistedAddress1)
          .safeTransferFrom(
            this.signers.whitelistedAddress1.address,
            this.signers.whitelistedAddress2.address,
            TYPE_ONE_TRANSACTION,
            1,
            [],
          ),
      ).to.be.revertedWith("Transfers are not allowed");
    });

    it("lets the claimer mint an NFT for another whitelisted address", async function () {
      // Addresses initially has no tokens
      expect(await theMergeNFT.balanceOf(this.signers.nonWhitelistedAddress.address, TYPE_VALIDATOR)).to.be.equal(0);
      expect(await theMergeNFT.balanceOf(this.signers.whitelistedAddress5.address, TYPE_VALIDATOR)).to.be.equal(0);

      // Claim the tokens
      await claimTokensAs(
        this.signers.nonWhitelistedAddress,
        claims[this.signers.whitelistedAddress5.address],
        leafNodes[4],
        this.signers.whitelistedAddress5.address,
      );

      // Check that all NFTs have been claimed, to the correct address
      expect(await theMergeNFT.balanceOf(this.signers.nonWhitelistedAddress.address, TYPE_VALIDATOR)).to.be.equal(0);
      expect(await theMergeNFT.balanceOf(this.signers.whitelistedAddress5.address, TYPE_VALIDATOR)).to.be.equal(1);
    });

    it("does not let the claimer mint an NFT for a nonwhitelisted address", async function () {
      await expect(
        claimTokensAs(
          this.signers.whitelistedAddress6,
          claims[this.signers.whitelistedAddress6.address],
          leafNodes[4],
          this.signers.nonWhitelistedAddress.address,
        ),
      ).to.be.revertedWith("Invalid proof.");
    });
  });
});

function generateLeafData(address: string, packedTokenIds: number): string {
  return ethers.utils.hexConcat([address, ethers.utils.hexZeroPad(ethers.utils.hexlify(packedTokenIds), 32)]);
}
