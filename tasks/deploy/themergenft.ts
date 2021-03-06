import { task } from "hardhat/config";
import { TaskArguments } from "hardhat/types";
import { HardhatEthersHelpers } from "@nomiclabs/hardhat-ethers/types";
import { TheMergeNFT } from "../../src/types/TheMergeNFT";
import { getMerkleRoot } from "../merkle-root";

async function deploy(ethers: HardhatEthersHelpers, contractName: string, deploymentArgs?: unknown[] | undefined) {
  const factory = await ethers.getContractFactory(contractName);
  const contract = await factory.deploy.apply(factory, Array.isArray(deploymentArgs) ? deploymentArgs : []);
  await contract.deployed();
  return contract;
}

task("deploy:nft")
  .addParam("whitelist", "The whitelist path")
  .addParam("uri", "The public metadata URI")
  .setAction(async function (taskArguments: TaskArguments, { ethers }) {
    const whitelistPath = taskArguments.whitelist;
    const publicUri = taskArguments.uri;
    const merkleRoot = await getMerkleRoot(whitelistPath);
    const theMergeNFT = <TheMergeNFT>await deploy(ethers, "TheMergeNFT", [merkleRoot, publicUri]);
    console.log("TheMergeNFT deployed to: ", theMergeNFT.address);

    console.log("Now waiting one minute for the contract to be deployed in order to verify it on Etherscan afterwards");
    await sleep(60000);

    console.log("Publishing source code to Etherscan");

    const hre = require("hardhat");
    await hre.run("verify:verify", {
      address: theMergeNFT.address,
      constructorArguments: [merkleRoot, publicUri],
    });
  });

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
