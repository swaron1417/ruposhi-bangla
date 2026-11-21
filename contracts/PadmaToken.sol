// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';
import '@openzeppelin/contracts/utils/cryptography/EIP712.sol';

contract PadmaToken is ERC20, Ownable, EIP712 {
    using ECDSA for bytes32;

    uint256 public constant FAUCET_AMOUNT = 100 * 10 ** 18;
    uint256 public constant FAUCET_COOLDOWN = 24 hours;

    address public rewardSigner;
    mapping(address => uint256) public lastFaucetClaim;
    mapping(address => mapping(uint256 => bool)) public rewardNonces;

    bytes32 public constant REWARD_TYPEHASH = keccak256(
        'Reward(address player,uint256 amount,uint256 nonce,uint256 deadline)'
    );

    event FaucetClaimed(address indexed player, uint256 amount);
    event RewardMinted(address indexed player, uint256 amount, uint256 indexed nonce);

    constructor(address initialOwner, address initialRewardSigner)
        ERC20('Padma Token', 'PADMA')
        Ownable(initialOwner)
        EIP712('RuposhiBangla Padma', '1')
    {
        rewardSigner = initialRewardSigner;
    }

    function setRewardSigner(address signer) external onlyOwner {
        rewardSigner = signer;
    }

    function claimFaucet() external {
        require(block.timestamp >= lastFaucetClaim[msg.sender] + FAUCET_COOLDOWN, 'Faucet cooldown');
        lastFaucetClaim[msg.sender] = block.timestamp;
        _mint(msg.sender, FAUCET_AMOUNT);
        emit FaucetClaimed(msg.sender, FAUCET_AMOUNT);
    }

    function mintVerifiedReward(
        address player,
        uint256 amount,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external {
        require(block.timestamp <= deadline, 'Voucher expired');
        require(!rewardNonces[player][nonce], 'Voucher already used');
        bytes32 structHash = keccak256(abi.encode(REWARD_TYPEHASH, player, amount, nonce, deadline));
        address signer = ECDSA.recover(_hashTypedDataV4(structHash), signature);
        require(signer == rewardSigner, 'Invalid voucher');
        rewardNonces[player][nonce] = true;
        _mint(player, amount);
        emit RewardMinted(player, amount, nonce);
    }
}
