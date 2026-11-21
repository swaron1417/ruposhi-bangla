// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import '@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';
import '@openzeppelin/contracts/utils/cryptography/EIP712.sol';

contract RuposhiKeepsakes is ERC721, ERC721URIStorage, Ownable, EIP712 {
    using ECDSA for bytes32;

    uint256 private _nextTokenId;
    address public achievementSigner;

    mapping(address => mapping(uint8 => bool)) public badgeOwned;
    mapping(address => mapping(uint256 => bool)) public achievementNonces;

    bytes32 public constant ACHIEVEMENT_TYPEHASH = keccak256(
        'Achievement(address player,uint8 chapter,uint256 nonce,uint256 deadline)'
    );

    event ChapterBadgeMinted(address indexed player, uint8 indexed chapter, uint256 indexed tokenId);

    constructor(address initialOwner, address initialAchievementSigner)
        ERC721('Ruposhi Bangla Keepsakes', 'RBK')
        Ownable(initialOwner)
        EIP712('RuposhiBangla Keepsakes', '1')
    {
        achievementSigner = initialAchievementSigner;
    }

    function setAchievementSigner(address signer) external onlyOwner {
        achievementSigner = signer;
    }

    function mintFreeBadge(uint8 chapter) external returns (uint256) {
        require(chapter >= 1 && chapter <= 5, 'Invalid chapter');
        require(!badgeOwned[msg.sender][chapter], 'Badge already owned');
        return _mintBadge(msg.sender, chapter);
    }

    function mintVerifiedBadge(
        address player,
        uint8 chapter,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external returns (uint256) {
        require(chapter >= 1 && chapter <= 5, 'Invalid chapter');
        require(block.timestamp <= deadline, 'Voucher expired');
        require(!achievementNonces[player][nonce], 'Voucher already used');
        require(!badgeOwned[player][chapter], 'Badge already owned');
        bytes32 structHash = keccak256(abi.encode(ACHIEVEMENT_TYPEHASH, player, chapter, nonce, deadline));
        address signer = ECDSA.recover(_hashTypedDataV4(structHash), signature);
        require(signer == achievementSigner, 'Invalid voucher');
        achievementNonces[player][nonce] = true;
        return _mintBadge(player, chapter);
    }

    function _mintBadge(address player, uint8 chapter) internal returns (uint256) {
        uint256 tokenId = ++_nextTokenId;
        badgeOwned[player][chapter] = true;
        _safeMint(player, tokenId);
        _setTokenURI(tokenId, string.concat('ipfs://ruposhi-bangla/chapter-', _toString(chapter)));
        emit ChapterBadgeMinted(player, chapter, tokenId);
        return tokenId;
    }

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function _toString(uint8 value) internal pure returns (string memory) {
        if (value == 0) return '0';
        uint8 digits;
        uint8 tmp = value;
        while (tmp != 0) { digits++; tmp /= 10; }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits--;
            buffer[digits] = bytes1(uint8(48 + value % 10));
            value /= 10;
        }
        return string(buffer);
    }
}
