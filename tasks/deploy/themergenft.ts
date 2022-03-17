import { task } from "hardhat/config";
import { TaskArguments } from "hardhat/types";
import { HardhatEthersHelpers } from "@nomiclabs/hardhat-ethers/types";
import { TheMergeNFT } from "../../src/types/TheMergeNFT";

async function deploy(ethers: HardhatEthersHelpers, contractName: string, deploymentArgs?: unknown[] | undefined) {
  const factory = await ethers.getContractFactory(contractName);
  const contract = await factory.deploy(deploymentArgs);
  await contract.deployed();
  return contract;
}

task("deploy")
  .addParam("merkleRoot", "The whitelist Merkle Tree root hash")
  .setAction(async function (taskArguments: TaskArguments, { ethers }) {
    const merkleRoot = taskArguments.merkleRoot;
    const theMergeNFT = <TheMergeNFT>await deploy(ethers, "TheMergeNFT", [merkleRoot]);
    console.log("TheMergeNFT deployed to: ", theMergeNFT.address);
  });
