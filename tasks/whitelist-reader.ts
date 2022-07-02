import { readFile } from "fs/promises";

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
