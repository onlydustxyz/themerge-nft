// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.13;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/// @title TheMergeNFT
/// @author abdelhamidbakhta
contract TheMergeNFT is ERC721URIStorage {
    using Counters for Counters.Counter;

    // Counter to manage NFT ids.
    Counters.Counter private _tokenIds;

    // Root hash of the whitelist Merkle Tree.
    bytes32 public merkleRoot;

    // mapping variable to mark whitelist addresses as having claimed.
    mapping(address => bool) public whitelistClaimed;

    constructor(bytes32 merkleRoot_) ERC721("TheMerge", "TM") {
        merkleRoot = merkleRoot_;
    }

    /// @dev Mint an NFT if whitelisted.
    /// @param nftType_ The type of NFT to mint.
    /// @param merkleProof_ Merkle proof.
    function whitelistMint(bytes32 nftType_, bytes32[] calldata merkleProof_) external returns (uint256) {
        // Ensure wallet hasn't already claimed.
        require(!whitelistClaimed[msg.sender], "Address has already claimed.");
        bytes memory data = abi.encodePacked(msg.sender, nftType_);
        bytes32 leaf = keccak256(data);

        // Verify the provider merkle proof.
        require(MerkleProof.verify(merkleProof_, merkleRoot, leaf), "Invalid proof.");
        // Mark address as having claimed their token.
        whitelistClaimed[msg.sender] = true;
        // Increment token id.
        _tokenIds.increment();
        // Get new token id.
        uint256 newTokenId = _tokenIds.current();
        // Mint NFT.
        _mint(msg.sender, newTokenId);
        return newTokenId;
    }
}
