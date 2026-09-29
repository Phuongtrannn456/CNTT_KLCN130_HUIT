// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title Web3 Educational Credential Registry (K-12)
/// @dev Luu tru Hash va Ownership cua Credential, KHONG luu PII hay diem so.
contract K12CredentialRegistry {
    
    struct Credential {
        bytes32 metadataHash; // Canonical JSON Hash (Keccak256)
        address studentWallet;
        address issuerWallet;
        uint256 issuedAt;
        bool isValid;
    }

    // Mapping tu credentialId (bytes32 UUID) -> Credential
    mapping(bytes32 => Credential) public credentials;
    
    // Authorization (Platform Relayers / Authorized Issuers)
    address public owner;
    mapping(address => bool) public authorizedIssuers;

    event CredentialIssued(bytes32 indexed credentialId, address indexed studentWallet, address indexed issuerWallet, bytes32 metadataHash);
    event CredentialRevoked(bytes32 indexed credentialId);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyIssuer() {
        require(authorizedIssuers[msg.sender] || msg.sender == owner, "Not authorized issuer");
        _;
    }

    constructor() {
        owner = msg.sender;
        authorizedIssuers[msg.sender] = true; // Deployer is also an issuer (Relayer)
    }

    function addIssuer(address _issuer) external onlyOwner {
        authorizedIssuers[_issuer] = true;
    }

    function removeIssuer(address _issuer) external onlyOwner {
        authorizedIssuers[_issuer] = false;
    }

    function issueCredential(
        bytes32 _credentialId,
        bytes32 _metadataHash,
        address _studentWallet,
        address _issuerWallet
    ) external onlyIssuer {
        require(credentials[_credentialId].issuedAt == 0, "Credential already exists");
        require(_studentWallet != address(0), "Invalid student wallet");

        credentials[_credentialId] = Credential({
            metadataHash: _metadataHash,
            studentWallet: _studentWallet,
            issuerWallet: _issuerWallet,
            issuedAt: block.timestamp,
            isValid: true
        });

        emit CredentialIssued(_credentialId, _studentWallet, _issuerWallet, _metadataHash);
    }

    function revokeCredential(bytes32 _credentialId) external onlyIssuer {
        require(credentials[_credentialId].issuedAt != 0, "Credential not found");
        require(credentials[_credentialId].isValid == true, "Already revoked");
        
        credentials[_credentialId].isValid = false;
        
        emit CredentialRevoked(_credentialId);
    }

    function verifyCredential(bytes32 _credentialId) external view returns (
        bytes32 metadataHash,
        address studentWallet,
        address issuerWallet,
        uint256 issuedAt,
        bool isValid
    ) {
        Credential memory cred = credentials[_credentialId];
        require(cred.issuedAt != 0, "Credential not found");
        return (cred.metadataHash, cred.studentWallet, cred.issuerWallet, cred.issuedAt, cred.isValid);
    }
}
