// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.13;

import "@magicdust/binary-erc1155/contracts/BinaryERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/// @title TheMergeNFT
/// @author abdelhamidbakhta
contract TheMergeNFT is BinaryERC1155, Ownable {
    // Token ids constants
    uint256 public constant ACTIVE_WALLET = 0;
    uint256 public constant VALIDATOR = 1;
    uint256 public constant SLASHED_VALIDATOR = 2;

    // Root hash of the whitelist Merkle Tree.
    bytes32 public merkleRoot;

    // mapping variable to mark whitelist addresses as having claimed.
    mapping(address => bool) public whitelistClaimed;

    constructor(bytes32 merkleRoot_, string memory uri) BinaryERC1155(uri) {
        merkleRoot = merkleRoot_;
    }

    /// @dev Set the new base URI
    /// @param newUri_ The new base URI
    function setURI(string calldata newUri_) public onlyOwner {
        _setURI(newUri_);
    }

    /// @dev Mint some NFTs if whitelisted.
    /// @param tokenIds_ The packed types of NFTs to mint.
    /// @param merkleProof_ Merkle proof.
    function whitelistMint(uint256 tokenIds_, bytes32[] calldata merkleProof_) external {
        require(tokenIds_ > 0, "No token ids provided");
        // Ensure wallet hasn't already claimed.
        require(!whitelistClaimed[msg.sender], "Address has already claimed their tokens.");
        bytes memory data = abi.encodePacked(msg.sender, tokenIds_);
        bytes32 leaf = keccak256(data);

        // Verify the provider merkle proof.
        require(MerkleProof.verify(merkleProof_, merkleRoot, leaf), "Invalid proof.");
        // Mark address as having claimed their token.
        whitelistClaimed[msg.sender] = true;

        _mintBatch(msg.sender, tokenIds_, "");
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
