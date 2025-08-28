const express = require("express");
const cors = require("cors");
const Groq = require("groq-sdk");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// System prompt for Groq API
const SYSTEM_PROMPT = `FIRST: Check if contract has mapping(uint256 => address) OR mapping(uint => address) for owners.
IF YES: This is an NFT contract. Use (define-non-fungible-token my-nft uint) NOT define-fungible-token.

Convert Solidity to Clarity. Generate PERFECT code with ZERO errors.

CRITICAL NFT DETECTION - FIRST PRIORITY:
Step 1: Check if contract has mapping(uint256 => address) OR mapping(uint => address) for owners
Step 2: If YES, this is an NFT contract - use (define-non-fungible-token my-nft uint)
Step 3: NEVER use (define-fungible-token) for contracts with owners mapping
Step 4: Use simple map operations for mint/transfer, NOT built-in nft functions

CRITICAL NAMING RULES:
1. State variables: add "stored-" prefix (uint x → stored-x)
2. Function parameters: add "param-" prefix (uint x → param-x)  
3. Function names: "get" → "get-value", "set" → "set-data"
4. NEVER reuse any name in the same contract

CONVERSION RULES:
- uint256/uint → uint (u0, u1, u100)
- address → principal
- bool → bool
- string → (string-ascii 50)
- msg.sender → contract-caller (NEVER tx-sender)
- require(condition) → (asserts! condition (err u100))
- require(condition, "message") → (asserts! condition (err u100))
- mapping(K => V) → (define-map name K V)

CRITICAL: ALWAYS use contract-caller, NEVER tx-sender for msg.sender conversions

VARIABLE TYPES:
- Simple variables: (define-data-var stored-name type initial-value)
- string private text → (define-data-var stored-text (string-ascii 50) "")
- uint256 private value → (define-data-var stored-value uint u0)
- Only use define-map for actual mappings, NOT simple variables

VARIABLE ACCESS - CRITICAL:
- Write to variable: (var-set stored-name new-value)
- Read from variable: (var-get stored-name) - NEVER just the variable name
- Return variable: (ok (var-get stored-name)) - ALWAYS use var-get

LOCAL VARIABLES - CRITICAL:
- Use (let ((var-name value)) ...) for local variables
- NEVER use (define var-name value) inside functions
- Example: (let ((current-id (var-get stored-counter))) ...)

COUNTER PATTERN - SIMPLIFIED SYNTAX:
uint counter; counter++; → 
(begin
  (var-set stored-counter (+ (var-get stored-counter) u1))
  ...use (- (var-get stored-counter) u1) for current id...)

FORBIDDEN PATTERNS:
- NEVER: (define (var-name) ...)
- NEVER: (define var-name ...)
- ALWAYS: (let ((var-name value)) ...)

MAPPING CONVERSION - CRITICAL:
- mapping(uint => string) → (define-map stored-data uint (string-ascii 50))
- Access: data[key] → (map-get? stored-data key)  
- Write: data[key] = value → (map-set stored-data key value)
- NEVER use define-data-var for mappings
- NEVER use empty-map function
- Maps are automatically empty when defined

EXAMPLE CORRECT MAP:
(define-map stored-data uint (string-ascii 50))

(define-public (set-data (param-key uint) (param-value (string-ascii 50)))
  (begin
    (map-set stored-data param-key param-value)
    (ok true)))

(define-read-only (get-value (param-key uint))
  (default-to "" (map-get? stored-data param-key)))

CRITICAL MAP SYNTAX:
- Simple map: (define-map balances principal uint)
- Composite key: (define-map allowances {owner: principal, spender: principal} uint)
- NEVER use parentheses around single types
- NEVER use invalid syntax like (define-map name (type1) (type2))

CONTRACT TYPES:
- Simple storage contracts: NO token definitions needed
- ERC20 contracts with balances mapping: (define-fungible-token name)
- NFT contracts with owners mapping: (define-non-fungible-token name uint)
- If contract has mapping(uint => address) owners: ALWAYS USE (define-non-fungible-token name uint)
- If contract has mapping(uint256 => address) owners: ALWAYS USE (define-non-fungible-token name uint)
- NEVER use define-fungible-token for NFT contracts with owners mapping
- Basic storage contracts should ONLY have maps and functions

NFT CONTRACT DETECTION:
- If you see mapping(uint => address) OR mapping(uint256 => address) for owners/ownership
- ALWAYS use (define-non-fungible-token my-nft uint)
- NEVER use (define-fungible-token) for NFT contracts

SYNTAX - EXACT ARGUMENT COUNTS:
- Variables: (define-data-var name type value) - EXACTLY 3 args
- Maps: (define-map name key-type value-type) - EXACTLY 3 args  
- map-set: (map-set map-name key value) - EXACTLY 3 args

MAP HANDLING:
- For mappings, use (define-map name key-type value-type)
- NEVER use define-data-var for mappings
- NEVER use empty-map - maps are empty by default
- Use map-get? to read, map-set to write
- Use default-to for missing values
- map-get?: (map-get? map-name key) - EXACTLY 2 args
- var-set: (var-set var-name value) - EXACTLY 2 args
- var-get: (var-get var-name) - EXACTLY 1 arg
- asserts!: (asserts! condition error) - EXACTLY 2 args
- Public: (define-public (name (param type)) (begin ... (ok true)))
- Read-only: (define-read-only (name) (ok value))
- Map access: (default-to u0 (map-get? map-name key))

EXAMPLES:

Simple Storage:
Input: uint x; function set(uint _x) { x = _x; } function get() returns (uint) { return x; }
Output:
(define-data-var stored-x uint u0)
(define-public (set-data (param-x uint))
  (begin
    (var-set stored-x param-x)
    (ok true)))
(define-read-only (get-value)
  (ok (var-get stored-x)))

ERC20:
Input: contract Token { mapping(address => uint) balances; function mint(address to, uint amount) { balances[to] += amount; } }
Output:
(define-fungible-token my-token)
(define-map stored-balances principal uint)
(define-public (mint (param-to principal) (param-amount uint))
  (begin
    (try! (ft-mint? my-token param-amount param-to))
    (map-set stored-balances param-to (+ (default-to u0 (map-get? stored-balances param-to)) param-amount))
    (ok true)))

TRANSFER FUNCTION EXAMPLE:
Input: function transfer(address to, uint amount) { balances[msg.sender] -= amount; balances[to] += amount; }
Output:
(define-public (transfer (param-to principal) (param-amount uint))
  (begin
    (asserts! (>= (default-to u0 (map-get? stored-balances contract-caller)) param-amount) (err u100))
    (map-set stored-balances contract-caller (- (default-to u0 (map-get? stored-balances contract-caller)) param-amount))
    (map-set stored-balances param-to (+ (default-to u0 (map-get? stored-balances param-to)) param-amount))
    (ok true)))

NFT CONTRACT - EXACT PATTERN:
Input: mapping(uint256 => address) private owners;
Output: 
(define-non-fungible-token my-nft uint)
(define-map stored-owners uint principal)

COMPLETE NFT EXAMPLE:
Input: contract NFT { mapping(uint256 => address) owners; uint counter; function mint(address to) { owners[counter] = to; counter++; } }
Output:
(define-non-fungible-token my-nft uint)
(define-map stored-owners uint principal)
(define-data-var stored-counter uint u0)
(define-public (mint (param-to principal))
  (begin
    (map-set stored-owners (var-get stored-counter) param-to)
    (var-set stored-counter (+ (var-get stored-counter) u1))
    (ok true)))

CRITICAL - ARGUMENT COUNT ERRORS:
- asserts!: (asserts! condition error) - EXACTLY 2 args
- map-get?: (map-get? map-name key) - EXACTLY 2 args  
- map-set: (map-set map-name key value) - EXACTLY 3 args
- var-get: (var-get var-name) - EXACTLY 1 arg
- var-set: (var-set var-name value) - EXACTLY 2 args
- ft-mint?: (ft-mint? token amount recipient) - EXACTLY 3 args
- ft-transfer?: (ft-transfer? token amount sender recipient) - EXACTLY 4 args
- nft-mint?: (nft-mint? token id recipient) - EXACTLY 3 args
- nft-transfer?: (nft-transfer? token id sender recipient) - EXACTLY 4 args

NFT CONTRACT PATTERN - CRITICAL:
For contracts with mapping(uint => address) owners:
1. ALWAYS use (define-non-fungible-token my-nft uint)
2. ALWAYS use (define-map stored-owners uint principal) 
3. For mint function: DO NOT use nft-mint?, just use map-set
4. For transfer function: DO NOT use nft-transfer?, just use map-set with asserts!

CORRECT NFT MINT PATTERN - SIMPLIFIED:
(define-public (mint (param-to principal))
  (begin
    (map-set stored-owners (var-get stored-counter) param-to)
    (var-set stored-counter (+ (var-get stored-counter) u1))
    (ok true)))

CRITICAL: For NFT contracts with mapping(uint => address) owners:
- MUST use (define-non-fungible-token my-nft uint)
- NEVER use (define-fungible-token) for NFT contracts
- Use simple map operations, NOT nft-mint? or nft-transfer?

CORRECT EXAMPLES:
- Assertion: (asserts! (is-eq owner tx-sender) (err u100))
- Map read: (map-get? stored-owners token-id)
- Map write: (map-set stored-owners token-id new-owner)
- Variable read: (var-get stored-counter)
- Variable write: (var-set stored-counter new-value)

MAP COMPARISON - CRITICAL - FIXED ARGUMENT COUNT:
- WRONG: (is-eq (map-get? map key) (some value)) - causes argument errors
- CORRECT: (is-eq (default-to 'SP000000000000000000002Q6VF78 (map-get? map key)) value)
- CORRECT: (asserts! (is-eq (default-to 'SP000000000000000000002Q6VF78 (map-get? stored-owners param-token-id)) param-from) (err u100))

NFT TRANSFER EXAMPLE - FIXED ARGUMENT COUNT:
(define-public (transfer (param-from principal) (param-to principal) (param-token-id uint))
  (begin
    (asserts! (is-eq (default-to 'SP000000000000000000002Q6VF78 (map-get? stored-owners param-token-id)) param-from) (err u100))
    (map-set stored-owners param-token-id param-to)
    (ok true)))

RETURN ONLY CLARITY CODE - NO EXPLANATIONS

FORMAT REQUIREMENTS:
- Use proper indentation (2 spaces for nested expressions)
- Add blank lines between function definitions
- No trailing whitespace
- Clean, readable formatting
- No markdown code blocks
- No comments or explanations`;

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    message: "Solidity → Clarity Converter API is running",
  });
});

// Plain text convert endpoint for terminal usage
app.post("/convert/plain", async (req, res) => {
  try {
    const { solidity_code } = req.body;

    if (!solidity_code) {
      return res
        .status(400)
        .send("Error: Missing solidity_code in request body");
    }

    // Send to Groq API
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: `${solidity_code}

IMPORTANT: If this contract has mapping(uint256 => address) OR mapping(uint => address) for owners, use (define-non-fungible-token my-nft uint) NOT define-fungible-token.`,
        },
      ],
      model: "llama3-8b-8192",
      temperature: 0.1,
      max_tokens: 2048,
    });

    const clarityCode = completion.choices[0]?.message?.content;

    if (!clarityCode) {
      return res
        .status(500)
        .send("Error: Failed to get response from Groq API");
    }

    // Clean the response to return only code
    let cleanCode = clarityCode;

    // Remove markdown code blocks
    cleanCode = cleanCode.replace(/```clarity\n?/g, "").replace(/```\n?/g, "");

    // Remove explanatory text patterns
    cleanCode = cleanCode.replace(/^Here is the converted.*?:\s*/i, "");
    cleanCode = cleanCode.replace(/^.*?converted.*?code.*?:\s*/i, "");
    cleanCode = cleanCode.replace(/Note:.*$/gm, "");
    cleanCode = cleanCode.replace(/^.*?explanation.*?$/gm, "");

    // Remove extra whitespace and ensure clean formatting
    cleanCode = cleanCode.trim();

    // Format the code with proper indentation and spacing
    const formattedCode = cleanCode
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        // Add proper indentation for nested expressions
        if (line.startsWith("(") && !line.startsWith("(define")) {
          return "  " + line;
        }
        return line;
      })
      .join("\n")
      .replace(/\)\n\n\(/g, ")\n\n(") // Ensure proper spacing between functions
      .replace(/\n{3,}/g, "\n\n"); // Remove excessive line breaks

    // Return plain text
    res.setHeader("Content-Type", "text/plain");
    res.send(formattedCode);
  } catch (error) {
    console.error("Conversion error:", error);
    res.status(500).send("Error: Internal server error during conversion");
  }
});

// Convert endpoint
app.post("/convert", async (req, res) => {
  try {
    const { solidity_code } = req.body;

    if (!solidity_code) {
      return res.status(400).json({
        status: "error",
        message: "Missing solidity_code in request body",
      });
    }

    // Send to Groq API
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: `${solidity_code}

IMPORTANT: If this contract has mapping(uint256 => address) OR mapping(uint => address) for owners, use (define-non-fungible-token my-nft uint) NOT define-fungible-token.`,
        },
      ],
      model: "llama3-8b-8192",
      temperature: 0.1,
      max_tokens: 2048,
    });

    const clarityCode = completion.choices[0]?.message?.content;

    if (!clarityCode) {
      return res.status(500).json({
        status: "error",
        message: "Failed to get response from Groq API",
      });
    }

    // Clean the response to return only code
    let cleanCode = clarityCode;

    // Remove markdown code blocks
    cleanCode = cleanCode.replace(/```clarity\n?/g, "").replace(/```\n?/g, "");

    // Remove explanatory text patterns
    cleanCode = cleanCode.replace(/^Here is the converted.*?:\s*/i, "");
    cleanCode = cleanCode.replace(/^.*?converted.*?code.*?:\s*/i, "");
    cleanCode = cleanCode.replace(/Note:.*$/gm, "");
    cleanCode = cleanCode.replace(/^.*?explanation.*?$/gm, "");

    // Remove extra whitespace and ensure clean formatting
    cleanCode = cleanCode.trim();

    // Format the code with proper indentation and spacing
    const formattedCode = cleanCode
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        // Add proper indentation for nested expressions
        if (line.startsWith("(") && !line.startsWith("(define")) {
          return "  " + line;
        }
        return line;
      })
      .join("\n")
      .replace(/\)\n\n\(/g, ")\n\n(") // Ensure proper spacing between functions
      .replace(/\n{3,}/g, "\n\n"); // Remove excessive line breaks

    // Check if request wants plain text (for terminal usage)
    const acceptHeader = req.headers.accept || "";
    const userAgent = req.headers["user-agent"] || "";

    // If curl or terminal request, return plain text
    if (acceptHeader.includes("text/plain") || userAgent.includes("curl")) {
      res.setHeader("Content-Type", "text/plain");
      return res.send(formattedCode);
    }

    // Return successful conversion as JSON
    res.json({
      status: "success",
      clarity_code: formattedCode,
    });
  } catch (error) {
    console.error("Conversion error:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error during conversion",
    });
  }
});

// Error handling middleware
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({
    status: "error",
    message: "Something went wrong!",
  });
});

// 404 handler
app.use("*", (_req, res) => {
  res.status(404).json({
    status: "error",
    message: "Endpoint not found",
  });
});

app.listen(PORT, () => {
  console.log(`Solidity → Clarity Converter API running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Convert endpoint: http://localhost:${PORT}/convert`);
});

module.exports = app;
