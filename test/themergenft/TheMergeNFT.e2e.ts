import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { artifacts, ethers, waffle } from "hardhat";
import { Artifact } from "hardhat/types";
import { TheMergeNFT } from "../../src/types/TheMergeNFT";

async function deployContract(signer: SignerWithAddress, artifactName: string, args?: unknown[]) {
  const artifact: Artifact = await artifacts.readArtifact(artifactName);

  const contract = await waffle.deployContract(signer, artifact, args);
  return contract;
}

describe("TheMergeNFT", function () {
  it("behaves like expected in an end-to-end scenario", async function () {
    const merkleRoot = "0x05e2adce700d2ba33ba39b8e2f55580d10c4c6d98994d68dfb89e7ad2501a5ca";
    const theMergeNFT = <TheMergeNFT>await deployContract(this.signers.admin, "TheMergeNFT", [merkleRoot]);
  });
});
