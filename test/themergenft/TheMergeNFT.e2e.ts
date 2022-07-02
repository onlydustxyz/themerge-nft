import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { artifacts, ethers, waffle } from "hardhat";
import { Artifact } from "hardhat/types";
import { TheMergeNFT } from "../../src/types/TheMergeNFT";
import { MerkleTree } from "merkletreejs";
import {} from "keccak256";
import { generateProofFor, generateWhitelistMerkleTree } from "../../tasks/merkle-root";
import { WhiteList } from "../../tasks/whitelist-reader";

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
    let whitelist: WhiteList;
    let merkleRoot: string;
    let theMergeNFT: TheMergeNFT;
    let merkleTree: MerkleTree;

    async function claimTokensAs(
      claimer: SignerWithAddress,
      { for_, proof, packedTypes }: { for_?: string; proof?: string[]; packedTypes?: number } = {},
    ) {
      for_ = for_ || claimer.address;
      const packedNftTypes = packedTypes || whitelist.find(entry => entry.address === claimer.address)?.packedTypes;
      if (!packedNftTypes) {
        throw new Error(`${claimer.address} not whitelisted`);
      }
      const merkleProof = proof || (await generateProofFor(claimer.address, packedNftTypes, merkleTree));
      await theMergeNFT.connect(claimer).mint(packedNftTypes, merkleProof, for_);
    }

    before(function () {
      // Create the whitelist
      whitelist = [
        {
          address: this.signers.whitelistedAddress1.address,
          packedTypes: packTokenIds([TYPE_ONE_TRANSACTION, TYPE_VALIDATOR, TYPE_SLASHED_VALIDATOR]),
        },
        {
          address: this.signers.whitelistedAddress2.address,
          packedTypes: packTokenIds([TYPE_ONE_TRANSACTION, TYPE_VALIDATOR, TYPE_SLASHED_VALIDATOR]),
        },
        {
          address: this.signers.whitelistedAddress3.address,
          packedTypes: packTokenIds([TYPE_ONE_TRANSACTION]),
        },
        {
          address: this.signers.whitelistedAddress4.address,
          packedTypes: packTokenIds([TYPE_VALIDATOR]),
        },
        {
          address: this.signers.whitelistedAddress5.address,
          packedTypes: packTokenIds([TYPE_VALIDATOR]),
        },
      ];

      // Build the Merkle Tree.
      merkleTree = generateWhitelistMerkleTree(whitelist);
      // Get the root hash of the Merkle Tree.
      merkleRoot = ethers.utils.hexlify(merkleTree.getRoot());
    });

    it("can be deployed", async function () {
      // Deploy the contract.
      theMergeNFT = <TheMergeNFT>await deployContract(this.signers.admin, "TheMergeNFT", [merkleRoot, BASE_URI]);
      expect(await theMergeNFT.merkleRoot()).to.be.equal(merkleRoot);
    });

    it("does not let an address claim their token with an invalid proof", async function () {
      await expect(
        claimTokensAs(this.signers.whitelistedAddress1, {
          proof: merkleTree.getHexProof("yolo"),
        }),
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
      await claimTokensAs(this.signers.whitelistedAddress1);

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
      await expect(claimTokensAs(this.signers.whitelistedAddress1)).to.be.revertedWith(
        "Address has already claimed their tokens.",
      );
    });

    it("does not let an address claim tokens with a proof not related to their address", async function () {
      const whitelistedNftTypes = whitelist.find(
        entry => entry.address === this.signers.whitelistedAddress2.address,
      )?.packedTypes;
      await expect(
        claimTokensAs(this.signers.whitelistedAddress2, {
          proof: await generateProofFor(this.signers.whitelistedAddress1.address, whitelistedNftTypes!, merkleTree),
        }),
      ).to.be.revertedWith("Invalid proof.");
    });

    it("does not let an address claim token types they are not whitelisted for", async function () {
      await expect(
        claimTokensAs(this.signers.whitelistedAddress3, {
          packedTypes: packTokenIds([
            TYPE_ONE_HUNDRED_TRANSACTIONS,
            TYPE_DEPLOYMENT,
            TYPE_TEN_DEPLOYMENTS,
            TYPE_HUNDRED_DEPLOYMENTS,
            TYPE_TEN_CALLS_TEN_CONTRACTS,
          ]),
        }),
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

    it("lets the claimer mint an NFT for someone else", async function () {
      // Addresses initially has no tokens
      expect(await theMergeNFT.balanceOf(this.signers.nonWhitelistedAddress.address, TYPE_VALIDATOR)).to.be.equal(0);
      expect(await theMergeNFT.balanceOf(this.signers.whitelistedAddress5.address, TYPE_VALIDATOR)).to.be.equal(0);

      // Claim the tokens
      await claimTokensAs(this.signers.whitelistedAddress5, { for_: this.signers.nonWhitelistedAddress.address });

      // Check that all NFTs have been claimed, to the correct address
      expect(await theMergeNFT.balanceOf(this.signers.nonWhitelistedAddress.address, TYPE_VALIDATOR)).to.be.equal(1);
      expect(await theMergeNFT.balanceOf(this.signers.whitelistedAddress5.address, TYPE_VALIDATOR)).to.be.equal(0);
    });
  });
});
