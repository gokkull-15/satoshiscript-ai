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
const SYSTEM_PROMPT = `Convert Solidity to Clarity. Generate PERFECT code with ZERO errors.

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
- msg.sender → tx-sender
- require(condition) → (asserts! condition (err u100))
- mapping(K => V) → (define-map name K V)

CRITICAL MAP SYNTAX:
- Simple map: (define-map balances principal uint)
- Composite key: (define-map allowances {owner: principal, spender: principal} uint)
- NEVER use parentheses around single types
- NEVER use invalid syntax like (define-map name (type1) (type2))

CONTRACT TYPES:
- Simple contracts: NO token definitions
- ERC20: (define-fungible-token name)
- ERC721: (define-non-fungible-token name uint)

SYNTAX - EXACT ARGUMENT COUNTS:
- Variables: (define-data-var name type value) - EXACTLY 3 args
- Maps: (define-map name key-type value-type) - EXACTLY 3 args  
- map-set: (map-set map-name key value) - EXACTLY 3 args
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
(define-map balances principal uint)
(define-public (mint (param-to principal) (param-amount uint))
  (begin
    (try! (ft-mint? my-token param-amount param-to))
    (map-set balances param-to (+ (default-to u0 (map-get? balances param-to)) param-amount))
    (ok true)))

NFT:
Input: contract NFT { mapping(uint => address) owners; function mint(address to, uint id) { owners[id] = to; } }
Output:
(define-non-fungible-token my-nft uint)
(define-public (mint (param-to principal) (param-id uint))
  (begin
    (try! (nft-mint? my-nft param-id param-to))
    (ok true)))

CRITICAL - ARGUMENT COUNT ERRORS:
- NEVER use extra arguments in any function
- Check every function call has correct argument count
- ft-mint?: (ft-mint? token amount recipient) - EXACTLY 3 args
- ft-transfer?: (ft-transfer? token amount sender recipient) - EXACTLY 4 args
- nft-mint?: (nft-mint? token id recipient) - EXACTLY 3 args
- nft-transfer?: (nft-transfer? token id sender recipient) - EXACTLY 4 args

RETURN ONLY CLARITY CODE - NO EXPLANATIONS`;

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    message: "Solidity → Clarity Converter API is running",
  });
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
          content: solidity_code,
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

    // Return successful conversion
    res.json({
      status: "success",
      clarity_code: cleanCode,
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
