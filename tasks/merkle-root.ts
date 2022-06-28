import { task } from "hardhat/config";
import { TaskArguments } from "hardhat/types";
import { ethers } from "ethers";
import { keccak256 } from "ethers/lib/utils";
import MerkleTree from "merkletreejs";
import { readWhitelist, WhiteList } from "./whitelist-reader";

export const generateWhitelistMerkleTree = (whitelist: WhiteList): MerkleTree => {
  const leaves = whitelist.map(({ address, nftTypes }) => generateLeafData(address, nftTypes));
  const whitelistMerkleTree = new MerkleTree(leaves, keccak256, {
    sortPairs: true,
  });
  return whitelistMerkleTree;
};

const generateLeafData = (address: string, types: number[]): string => {
  return keccak256(ethers.utils.hexConcat([address, ...types.map(toBytes32)]));
};

const toBytes32 = (value: number): string => {
  return ethers.utils.hexZeroPad(ethers.utils.hexlify(value), 32);
};

export const getMerkleRoot = async (pathToWhitelist: string): Promise<string> => {
  const whitelist = await readWhitelist(pathToWhitelist);
  const merkleTree = generateWhitelistMerkleTree(whitelist);
  return ethers.utils.hexlify(merkleTree.getRoot());
};

task("merkle-root", "Computes the merkle root from a given whitelist file")
  .addParam("whitelist", "Path to the whitelist file")
  .setAction(async (taskArguments: TaskArguments, { ethers }) => {
    const whitelistPath = taskArguments.whitelist;
    const merkleRoot = await getMerkleRoot(whitelistPath);
    console.log("Merkle root: ", merkleRoot);
  });
