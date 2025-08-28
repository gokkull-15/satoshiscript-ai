# 🧪 Solidity → Clarity Converter Test Suite

> **3 Essential Contract Tests with Complete Curl Commands**

---

## 📋 Test Overview

| Contract          | Type    | Status     | Curl Command | Expected Output |
| ----------------- | ------- | ---------- | ------------ | --------------- |
| 1. Read/Write     | Mapping | ✅ Working | ✅ Provided  | ✅ Verified     |
| 2. Store/Retrieve | Storage | ✅ Working | ✅ Provided  | ✅ Verified     |
| 3. NFT Minting    | Token   | ✅ Working | ✅ Provided  | ✅ Corrected    |

---

## 🧪 Test 1: Read/Write Contract

### 📝 Solidity Input

```solidity
pragma solidity ^0.8.0;

contract ReadWrite {
    mapping(address => uint256) public balances;

    function write(address user, uint256 amount) public {
        balances[user] = amount;
    }

    function read(address user) public view returns (uint256) {
        return balances[user];
    }
}
```

### 🔄 Curl Command

```bash
curl -X POST http://localhost:3000/convert \
  -H "Content-Type: application/json" \
  -d '{
    "solidity_code": "pragma solidity ^0.8.0;\n\ncontract ReadWrite {\n    mapping(address => uint256) public balances;\n    \n    function write(address user, uint256 amount) public {\n        balances[user] = amount;\n    }\n    \n    function read(address user) public view returns (uint256) {\n        return balances[user];\n    }\n}"
  }'
```

### ✅ Expected Clarity Output

```clarity
(define-map balances principal uint)

(define-public (write (user principal) (amount uint))
  (begin
    (map-set balances user amount)
    (ok true)))

(define-read-only (read (user principal))
  (default-to u0 (map-get? balances user)))
```

### 🖥️ API Response Format (Clean Terminal Output)

```json
{
  "clarity_code": "(define-map balances principal uint)\n\n(define-public (write (user principal) (amount uint))\n  (begin\n    (map-set balances user amount)\n    (ok true)))\n\n(define-read-only (read (user principal))\n  (default-to u0 (map-get? balances user)))"
}
```

### 📺 What User Sees in Terminal (Formatted)

```clarity
(define-map balances principal uint)

(define-public (write (user principal) (amount uint))
  (begin
    (map-set balances user amount)
    (ok true)))

(define-read-only (read (user principal))
  (default-to u0 (map-get? balances user)))
```

---

## 🧪 Test 2: Store/Retrieve Contract

### 📝 Solidity Input

```solidity
pragma solidity ^0.8.0;

contract StoreRetrieve {
    uint256 private storedData;

    function store(uint256 value) public {
        storedData = value;
    }

    function retrieve() public view returns (uint256) {
        return storedData;
    }
}
```

### 🔄 Curl Command

```bash
curl -X POST http://localhost:3000/convert \
  -H "Content-Type: application/json" \
  -d '{
    "solidity_code": "pragma solidity ^0.8.0;\n\ncontract StoreRetrieve {\n    uint256 private storedData;\n    \n    function store(uint256 value) public {\n        storedData = value;\n    }\n    \n    function retrieve() public view returns (uint256) {\n        return storedData;\n    }\n}"
  }'
```

### ✅ Expected Clarity Output

```clarity
(define-data-var stored-data uint u0)

(define-public (store (value uint))
  (begin
    (var-set stored-data value)
    (ok true)))

(define-read-only (retrieve)
  (var-get stored-data))
```

### 🖥️ API Response Format (Clean Terminal Output)

```json
{
  "clarity_code": "(define-data-var stored-data uint u0)\n\n(define-public (store (value uint))\n  (begin\n    (var-set stored-data value)\n    (ok true)))\n\n(define-read-only (retrieve)\n  (var-get stored-data))"
}
```

### 📺 What User Sees in Terminal (Formatted)

```clarity
(define-data-var stored-data uint u0)

(define-public (store (value uint))
  (begin
    (var-set stored-data value)
    (ok true)))

(define-read-only (retrieve)
  (var-get stored-data))
```

---

## 🧪 Test 3: NFT Minting Contract

### 📝 Solidity Input

```solidity
pragma solidity ^0.8.0;

contract BasicNFT {
    mapping(uint256 => address) private owners;
    uint256 private tokenCounter;

    function mint(address to) public returns (uint256) {
        uint256 tokenId = tokenCounter;
        tokenCounter++;
        owners[tokenId] = to;
        return tokenId;
    }

    function ownerOf(uint256 tokenId) public view returns (address) {
        return owners[tokenId];
    }

    function totalSupply() public view returns (uint256) {
        return tokenCounter;
    }
}
```

### 🔄 Curl Command

```bash
curl -X POST http://localhost:3000/convert \
  -H "Content-Type: application/json" \
  -d '{
    "solidity_code": "pragma solidity ^0.8.0;\n\ncontract BasicNFT {\n    mapping(uint256 => address) private owners;\n    uint256 private tokenCounter;\n    \n    function mint(address to) public returns (uint256) {\n        uint256 tokenId = tokenCounter;\n        tokenCounter++;\n        owners[tokenId] = to;\n        return tokenId;\n    }\n    \n    function ownerOf(uint256 tokenId) public view returns (address) {\n        return owners[tokenId];\n    }\n    \n    function totalSupply() public view returns (uint256) {\n        return tokenCounter;\n    }\n}"
  }'
```

### ❌ Current Converter Output (BROKEN)

```clarity
(define-fungible-token basic-nft)
(define-map stored-owners uint principal)
(define-data-var stored-token-counter uint u0)

(define-public (mint (param-to principal))
  (let ((stored-token-id (var-get stored-token-counter)))
    (asserts! (some param-to) (err u1))
    (var-set stored-token-counter (+ stored-token-id u1))
    (map-set stored-owners stored-token-id param-to)
    (ok stored-token-id)))
```

### ✅ Correct Clarity Output (WORKING)

```clarity
(define-non-fungible-token basic-nft uint)
(define-data-var token-counter uint u0)

(define-public (mint (to principal))
  (let ((token-id (var-get token-counter)))
    (var-set token-counter (+ token-id u1))
    (match (nft-mint? basic-nft token-id to)
      success (ok token-id)
      error (err u1))))

(define-read-only (owner-of (token-id uint))
  (nft-get-owner? basic-nft token-id))

(define-read-only (total-supply)
  (ok (var-get token-counter)))
```

### 🖥️ API Response Format (Clean Terminal Output)

```json
{
  "clarity_code": "(define-non-fungible-token basic-nft uint)\n(define-data-var token-counter uint u0)\n\n(define-public (mint (to principal))\n  (let ((token-id (var-get token-counter)))\n    (var-set token-counter (+ token-id u1))\n    (match (nft-mint? basic-nft token-id to)\n      success (ok token-id)\n      error (err u1))))\n\n(define-read-only (owner-of (token-id uint))\n  (nft-get-owner? basic-nft token-id))\n\n(define-read-only (total-supply)\n  (ok (var-get token-counter)))"
}
```

### 📺 What User Sees in Terminal (Formatted)

```clarity
(define-non-fungible-token basic-nft uint)
(define-data-var token-counter uint u0)

(define-public (mint (to principal))
  (let ((token-id (var-get token-counter)))
    (var-set token-counter (+ token-id u1))
    (match (nft-mint? basic-nft token-id to)
      success (ok token-id)
      error (err u1))))

(define-read-only (owner-of (token-id uint))
  (nft-get-owner? basic-nft token-id))

(define-read-only (total-supply)
  (ok (var-get token-counter)))
```

---

## 🚨 Known Issues & Training Data

### ❌ **Current Converter Problems**

1. **NFT Token Type**: Uses `define-fungible-token` instead of `define-non-fungible-token`
2. **Redundant Maps**: Creates custom ownership maps when `define-non-fungible-token` handles this
3. **Argument Errors**: `(some param-to)` causes "expecting 2 arguments, got 5"
4. **Missing Error Handling**: Doesn't use `match` for `nft-mint?` responses

### ✅ **Training Patterns for AI**

#### Pattern 1: Mapping Conversion

```
Solidity: mapping(address => uint256) public balances;
Clarity:  (define-map balances principal uint)
```

#### Pattern 2: Storage Variable Conversion

```
Solidity: uint256 private storedData;
Clarity:  (define-data-var stored-data uint u0)
```

#### Pattern 3: NFT Token Definition

```
Solidity: // NFT contract with uint256 tokenId
Clarity:  (define-non-fungible-token contract-name uint)
```

#### Pattern 4: Function Conversion

```
Solidity: function store(uint256 value) public { storedData = value; }
Clarity:  (define-public (store (value uint))
            (begin
              (var-set stored-data value)
              (ok true)))
```

#### Pattern 5: NFT Minting (CORRECTED)

```
Solidity: owners[tokenId] = to; return tokenId;
Clarity:  (match (nft-mint? token-name token-id to)
            success (ok token-id)
            error (err u1))
```

#### Pattern 6: NFT Owner Lookup

```
Solidity: return owners[tokenId];
Clarity:  (nft-get-owner? token-name token-id)
```

---

## 🎯 Test Results Summary

| Test               | Converter Status | Manual Fix | Success Rate |
| ------------------ | ---------------- | ---------- | ------------ |
| **Read/Write**     | ✅ Works         | ✅ Works   | 100%         |
| **Store/Retrieve** | ✅ Works         | ✅ Works   | 100%         |
| **NFT Minting**    | ❌ Broken        | ✅ Works   | 0% → 100%    |

### 🔧 **Quick Fix for NFT Contracts**

1. Replace `define-fungible-token` with `define-non-fungible-token`
2. Remove custom ownership maps (use built-in NFT ownership)
3. Use `nft-get-owner?` instead of custom map lookups
4. Use `match` to handle `nft-mint?` responses properly
5. Return `(ok token-id)` on successful mint

---

## 🚀 Deployment Commands

### Test Read/Write Contract

```bash
curl -X POST http://localhost:3999/v2/contracts/call-read/ST1.../read-write/write \
  -d '{"sender": "ST1...", "arguments": ["ST1...", "u100"]}'
```

### Test Store/Retrieve Contract

```bash
curl -X POST http://localhost:3999/v2/contracts/call-read/ST1.../store-retrieve/store \
  -d '{"sender": "ST1...", "arguments": ["u42"]}'
```

### Test NFT Contract (Use Working Version)

```bash
curl -X POST http://localhost:3999/v2/contracts/call-read/ST1.../basic-nft/mint \
  -d '{"sender": "ST1...", "arguments": ["ST1..."]}'
```

---

> **🎯 Training Goal**: Improve AI conversion accuracy from 67% (2/3) to 100% (3/3) by using proper NFT patterns with `define-non-fungible-token` and built-in ownership management.
