import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import type { Fixture, MockContract } from "ethereum-waffle";

declare module "mocha" {
  export interface Context {
    loadFixture: <T>(fixture: Fixture<T>) => Promise<T>;
    signers: Signers;
    mocks: Mocks;
    impersonations: Impersonations;
  }
}

export interface Signers {
  admin: SignerWithAddress;
  whitelistedAddress1: SignerWithAddress;
  whitelistedAddress2: SignerWithAddress;
  whitelistedAddress3: SignerWithAddress;
  whitelistedAddress4: SignerWithAddress;
  whitelistedAddress5: SignerWithAddress;
  whitelistedAddress6: SignerWithAddress;
  whitelistedAddress7: SignerWithAddress;
  nonWhitelistedAddress: SignerWithAddress;
}

export interface Mocks {}

export interface Impersonations {}
