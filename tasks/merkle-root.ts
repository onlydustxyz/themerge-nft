import { readFile } from "fs/promises";
import { task } from "hardhat/config";
import { TaskArguments } from "hardhat/types";
import { ethers } from "ethers";
import { keccak256 } from "ethers/lib/utils";
import MerkleTree from "merkletreejs";

export type WhiteList = {
  address: string;
  packedTypes: number;
}[];

export const readWhitelist = async (path: string): Promise<WhiteList> => {
  const whitelist = JSON.parse(await readFile(path, "utf-8"));
  return whitelist.map(({ address, nft }: { address: string; nft: string }) => ({
    address,
    packedTypes: parseInt(nft, 16),
  }));
};

export const generateWhitelistMerkleTree = (whitelist: WhiteList): MerkleTree => {
  const leaves = whitelist.map(({ address, packedTypes }) => generateLeafData(address, unpackNftTypes(packedTypes)));
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

export const unpackNftTypes = (packedValue: number): number[] => {
  const result = [];
  let currentBit = 0;
  while (2 ** currentBit <= packedValue) {
    if (packedValue & (2 ** currentBit)) {
      result.push(currentBit);
    }
    currentBit++;
  }
  return result;
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
