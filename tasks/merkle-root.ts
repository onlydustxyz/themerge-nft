import { task } from "hardhat/config";
import { TaskArguments } from "hardhat/types";
import { ethers } from "ethers";
import { keccak256 } from "ethers/lib/utils";
import MerkleTree from "merkletreejs";
import { readWhitelist, WhiteList } from "./whitelist-reader";

export const generateWhitelistMerkleTree = (whitelist: WhiteList): MerkleTree => {
  const leaves = whitelist.map(({ address, packedTypes }) => generateLeafData(address, packedTypes));
  const whitelistMerkleTree = new MerkleTree(leaves, keccak256, {
    sortPairs: true,
  });
  return whitelistMerkleTree;
};

const generateLeafData = (address: string, packedNftTypes: number): string => {
  return keccak256(ethers.utils.hexConcat([address, toBytes32(packedNftTypes)]));
};

const toBytes32 = (value: number): string => {
  return ethers.utils.hexZeroPad(ethers.utils.hexlify(value), 32);
};

export const getMerkleRoot = async (pathToWhitelist: string): Promise<string> => {
  const whitelist = await readWhitelist(pathToWhitelist);
  const merkleTree = generateWhitelistMerkleTree(whitelist);
  return ethers.utils.hexlify(merkleTree.getRoot());
};

export const generateProofFor = async (
  address: string,
  packedNftTypes: number,
  merkleTree: MerkleTree,
): Promise<string[]> => {
  const leafData = generateLeafData(address, packedNftTypes);
  return merkleTree.getHexProof(leafData);
};

task("merkle-root", "Computes the merkle root from a given whitelist file")
  .addParam("whitelist", "Path to the whitelist file")
  .setAction(async (taskArguments: TaskArguments, { ethers }) => {
    const whitelistPath = taskArguments.whitelist;
    const merkleRoot = await getMerkleRoot(whitelistPath);
    console.log("Merkle root: ", merkleRoot);
  });
