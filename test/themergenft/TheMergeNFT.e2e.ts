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

describe("TheMergeNFT", function () {
  it("behaves like expected in an end-to-end scenario", async function () {
    // Declare the list of whitelisted addresses.
    const whitelistAddresses = [
      this.signers.whitelistedAddress1.address,
      this.signers.whitelistedAddress2.address,
      this.signers.whitelistedAddress3.address,
      this.signers.whitelistedAddress4.address,
      this.signers.whitelistedAddress5.address,
      this.signers.whitelistedAddress6.address,
      this.signers.whitelistedAddress7.address,
    ];
    // Build leaf nodes from whitelisted addresses.
    const leafNodes = whitelistAddresses.map(addr => keccak256(addr));
    // Build the Merkle Tree.
    const whitelistMerkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true });
    // Get the root hash of the Merkle Tree.
    const whitelistMerkleRootHash = whitelistMerkleTree.getRoot();
    // Deploy the contract.
    const theMergeNFT = <TheMergeNFT>await deployContract(this.signers.admin, "TheMergeNFT", [whitelistMerkleRootHash]);
    expect(await theMergeNFT.merkleRoot()).to.be.equal(ethers.utils.hexlify(whitelistMerkleRootHash));

    let claimingAddress;
    let merkleProof;
    // 1. Claim with whitelisted address and correct proof.
    claimingAddress = leafNodes[0];
    merkleProof = whitelistMerkleTree.getHexProof(claimingAddress);
    await theMergeNFT.connect(this.signers.whitelistedAddress1).whitelistMint(merkleProof);
    expect(await theMergeNFT.balanceOf(this.signers.whitelistedAddress1.address)).to.be.equal(1);

    // 2. Cannot claim twice.
    await expect(theMergeNFT.connect(this.signers.whitelistedAddress1).whitelistMint(merkleProof)).to.be.revertedWith(
      "Address has already claimed.",
    );

    // 3. Cannot claim with a valid proof if sender is not the address used for the proof.
    claimingAddress = leafNodes[2];
    merkleProof = whitelistMerkleTree.getHexProof(claimingAddress);
    await expect(theMergeNFT.connect(this.signers.whitelistedAddress2).whitelistMint(merkleProof)).to.be.revertedWith(
      "Invalid proof.",
    );

    // 4. Claim with whitelisted address and correct proof.
    await theMergeNFT.connect(this.signers.whitelistedAddress3).whitelistMint(merkleProof);
    expect(await theMergeNFT.balanceOf(this.signers.whitelistedAddress3.address)).to.be.equal(1);
  });
});
