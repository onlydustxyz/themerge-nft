// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.13;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/// @title TheMergeNFT
/// @author abdelhamidbakhta
contract TheMergeNFT is ERC1155, Ownable {
    // Token ids constants
    uint256 public constant ACTIVE_WALLET = 0;
    uint256 public constant VALIDATOR = 1;
    uint256 public constant SLASHED_VALIDATOR = 2;

    // Root hash of the whitelist Merkle Tree.
    bytes32 public merkleRoot;

    // mapping variable to mark whitelist addresses as having claimed.
    mapping(address => bool) public whitelistClaimed;

    constructor(bytes32 merkleRoot_, string memory uri) ERC1155(uri) {
        merkleRoot = merkleRoot_;
    }

    /// @dev Set the new base URI
    /// @param newUri_ The new base URI
    function setURI(string calldata newUri_) public onlyOwner {
        _setURI(newUri_);
    }

    /// @dev Mint an NFT if whitelisted.
    /// @param nftTypes_ The types of the NFTs to mint.
    /// @param merkleProof_ Merkle proof.
    function whitelistMint(uint256[] calldata nftTypes_, bytes32[] calldata merkleProof_) external {
        // Ensure wallet hasn't already claimed.
        require(!whitelistClaimed[msg.sender], "Address has already claimed.");
        bytes memory data = abi.encodePacked(msg.sender, nftTypes_);
        bytes32 leaf = keccak256(data);

        // Verify the provider merkle proof.
        require(MerkleProof.verify(merkleProof_, merkleRoot, leaf), "Invalid proof.");
        // Mark address as having claimed their token.
        whitelistClaimed[msg.sender] = true;

        uint256[] memory amounts = new uint256[](nftTypes_.length);
        for (uint8 i = 0; i < nftTypes_.length; i++) {
            amounts[i] = 1;
        }

        _mintBatch(msg.sender, nftTypes_, amounts, "");
    }

    /// @notice Decompose a provided number into its composing powers of 2
    /// @dev Iteratively shift the number's binary representation to the right and check for the result parity
    /// @param number_ The number to decompose
    /// @return decomposition The array of powers of 2 composing the number
    function decomposeUint(uint256 number_) public pure returns (uint256[] memory decomposition) {
        // solhint-disable no-inline-assembly
        // Assembly is needed here to create a dynamic size array in memory instead of a storage one
        assembly {
            let shiftedInput := number_
            let currentPowerOf2 := 0
            let decompositionLength := 0

            // solhint-disable no-empty-blocks
            // This for loop is a while loop in disguise
            for {

            } gt(shiftedInput, 0) {
                // Increase the power of 2 by 1 after each iteration
                currentPowerOf2 := add(1, currentPowerOf2)
                // Shift the input to the right by 1
                shiftedInput := shr(1, shiftedInput)
            } {
                // Check if the shifted input is odd
                let parity := mod(shiftedInput, 2)
                if eq(parity, 1) {
                    // The shifter input is odd, let's add this power of 2 to the decomposition array
                    decompositionLength := add(1, decompositionLength)
                    mstore(add(decomposition, mul(decompositionLength, 0x20)), currentPowerOf2)
                }
            }
            // Set the length of the decomposition array
            mstore(decomposition, decompositionLength)
            // Update the free memory pointer according to the decomposition array size
            mstore(0x40, add(decomposition, mul(add(decompositionLength, 1), 0x20)))
        }
    }

    function _beforeTokenTransfer(
        address,
        address from,
        address,
        uint256[] memory,
        uint256[] memory,
        bytes memory
    ) internal pure override {
        require(from == address(0), "Transfers are not allowed");
    }
}
