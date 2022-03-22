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

task("deploy:nft")
  .addParam("root", "The whitelist Merkle Tree root hash")
  .setAction(async function (taskArguments: TaskArguments, { ethers }) {
    const merkleRoot = taskArguments.root;
    console.log("Merkle root: ", merkleRoot);
    const theMergeNFT = <TheMergeNFT>await deploy(ethers, "TheMergeNFT", merkleRoot);
    console.log("TheMergeNFT deployed to: ", theMergeNFT.address);

    await sleep(60000);

    console.log("publishing source code to Etherscan");

    const hre = require("hardhat");
    await hre.run("verify:verify", {
      address: theMergeNFT.address,
      constructorArguments: [merkleRoot],
    });
  });

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
