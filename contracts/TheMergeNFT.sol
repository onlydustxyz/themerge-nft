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
    function whitelistMint(uint8[] calldata nftTypes_, bytes32[] calldata merkleProof_) external {
        // Ensure wallet hasn't already claimed.
        require(!whitelistClaimed[msg.sender], "Address has already claimed.");
        bytes memory data = abi.encodePacked(msg.sender, nftTypes_);
        bytes32 leaf = keccak256(data);

        // Verify the provider merkle proof.
        require(MerkleProof.verify(merkleProof_, merkleRoot, leaf), "Invalid proof.");
        // Mark address as having claimed their token.
        whitelistClaimed[msg.sender] = true;

        for (uint256 i = 0; i < nftTypes_.length; i++) {
            // Mint NFT.
            _mint(msg.sender, nftTypes_[i], 1, "");
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
