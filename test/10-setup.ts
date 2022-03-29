import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { Impersonations, Mocks, Signers } from "./types";

before(async function () {
  this.signers = {} as Signers;

  const signers: SignerWithAddress[] = await ethers.getSigners();
  this.signers.admin = signers[0];
  this.signers.whitelistedAddress1 = signers[1];
  this.signers.whitelistedAddress2 = signers[2];
  this.signers.whitelistedAddress3 = signers[3];
  this.signers.whitelistedAddress4 = signers[4];
  this.signers.whitelistedAddress5 = signers[5];
  this.signers.whitelistedAddress6 = signers[6];
  this.signers.whitelistedAddress7 = signers[7];
  this.signers.nonWhitelistedAddress = signers[8];

  this.mocks = {} as Mocks;
  this.impersonations = {} as Impersonations;
});
