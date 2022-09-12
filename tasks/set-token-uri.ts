import { task } from "hardhat/config";
import { TaskArguments } from "hardhat/types";
import { TheMergeNFT } from "../src/types/TheMergeNFT";

task("set-token-uri", "Sets the token URI variable in the deployed smart contract")
  .addParam("address", "Address of the deployed smart contract")
  .addParam("tokenUri", "Value of the token URI to set")
  .setAction(async (taskArguments: TaskArguments, { ethers }) => {
    const factory = await ethers.getContractFactory("TheMergeNFT");
    const contract = <TheMergeNFT>factory.attach(taskArguments.address);

    const transaction = await contract.setURI(taskArguments.tokenUri);

    console.log("Token URI set to: ", taskArguments.tokenUri);
    console.log("Transaction hash: ", transaction.hash);
    console.log("Waiting for transaction to be mined...");

    await transaction.wait();

    console.log("Transaction mined");
  });
