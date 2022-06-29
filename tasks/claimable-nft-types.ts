import { task } from "hardhat/config";
import { TaskArguments } from "hardhat/types";
import { readWhitelist } from "./whitelist-reader";

const nftTypesNames = [
  "do_one_transaction",
  "do_100_tansactions",
  "deploy_contract",
  "deploy_10_contract",
  "deploy_100_contract",
  "do_10_transactions_to_10_contracts",
  "become_validator",
  "slashed_validator",
]; // based on https://github.com/onlydustxyz/eth-validator-watcher/blob/main/web-api/src/packed_nft_types.rs

task("claimable-nft-types", "Reads from the whitelist to list claimable NFT types for an address")
  .addParam("whitelist", "Path to the whitelist file")
  .addParam("address", "Address to list claimable NFT types for")
  .setAction(async (taskArguments: TaskArguments, { ethers }) => {
    const whitelistPath = taskArguments.whitelist;
    const candidateAddress = taskArguments.address;
    const whitelist = await readWhitelist(whitelistPath);
    const claimableNftTypes = whitelist.find(({ address }) => address.toLowerCase() === candidateAddress.toLowerCase());
    if (!claimableNftTypes) {
      throw new Error(`No whitelist entry found for address ${candidateAddress}`);
    }
    const claimableNames = claimableNftTypes.nftTypes.map(nftType => nftTypesNames[nftType]);
    console.log("Claimable NFT types: ", claimableNames);
  });
