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
const SYSTEM_PROMPT = `Convert Solidity to Clarity with PERFECT accuracy using these training examples.

CORE CONVERSION RULES:
- uint256/uint → uint (u0, u1, u100)
- address → principal  
- mapping → define-map
- require → if with (err ...) or (ok ...)
- event → print
- ERC721 → SIP-009 NFT standard
- msg.sender → tx-sender

CRITICAL MAPPING SYNTAX:
For composite keys/values, use tuple syntax:
- mapping(address => uint256) → (define-map balances {account: principal} {amount: uint})
- Access: (map-get? balances {account: addr})
- Set: (map-set balances {account: tx-sender} {amount: amount})
- Get value: (get amount (map-get? balances {account: addr}))

TRAINING EXAMPLES:

EXAMPLE 1 - Simple Storage:
Solidity:
pragma solidity ^0.8.0;
contract StorageExample {
    uint256 public number;
    function store(uint256 _num) public {
        number = _num;
    }
    function retrieve() public view returns (uint256) {
        return number;
    }
}

Clarity:
(define-data-var number uint u0)
(define-public (store (num uint))
  (ok (var-set number num)))
(define-read-only (retrieve)
  (ok (var-get number)))

EXAMPLE 2 - Mapping with tx-sender:
Solidity:
pragma solidity ^0.8.0;
contract MappingExample {
    mapping(address => uint256) public balances;
    function setBalance(uint256 _amount) public {
        balances[msg.sender] = _amount;
    }
    function getBalance(address _addr) public view returns (uint256) {
        return balances[_addr];
    }
}

Clarity:
(define-map balances {account: principal} {amount: uint})
(define-public (set-balance (amount uint))
  (ok (map-set balances {account: tx-sender} {amount: amount})))
(define-read-only (get-balance (addr principal))
  (default-to u0 (get amount (map-get? balances {account: addr}))))

EXAMPLE 3 - Require with if/err:
Solidity:
pragma solidity ^0.8.0;
contract RequireExample {
    uint256 public count = 0;
    function increment() public {
        require(count < 10, "Count limit reached");
        count++;
    }
}

Clarity:
(define-data-var count uint u0)
(define-public (increment)
  (if (< (var-get count) u10)
    (begin
      (var-set count (+ (var-get count) u1))
      (ok true))
    (err "Count limit reached")))

EXAMPLE 4 - Events with print:
Solidity:
pragma solidity ^0.8.0;
contract EventExample {
    event Stored(uint256 value);
    uint256 public value;
    function store(uint256 _val) public {
        value = _val;
        emit Stored(_val);
    }
}

Clarity:
(define-data-var value uint u0)
(define-public (store (val uint))
  (begin
    (var-set value val)
    (print {event: "Stored", value: val})
    (ok true)))

EXAMPLE 5 - ERC721/NFT:
Solidity:
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
contract MyNFT is ERC721 {
    uint256 public tokenCounter;
    constructor() ERC721("MyNFT", "NFT") {
        tokenCounter = 0;
    }
    function mintNFT(address to) public returns (uint256) {
        uint256 newTokenId = tokenCounter;
        _safeMint(to, newTokenId);
        tokenCounter++;
        return newTokenId;
    }
}

Clarity:
(define-non-fungible-token my-nft uint)
(define-data-var token-counter uint u0)
(define-public (mint (recipient principal))
  (let ((token-id (var-get token-counter)))
    (begin
      (var-set token-counter (+ token-id u1))
      (ok (nft-mint? my-nft token-id recipient)))))

CRITICAL PATTERNS:
1. Always use tuple syntax for maps: {key: type} {value: type}
2. Use tx-sender for msg.sender (NOT contract-caller)
3. Use (get field-name (map-get? ...)) to extract values from tuples
4. Use if/err pattern for require statements
5. Use print for events
6. Use let bindings for local variables
7. Use nft-mint? for NFT minting

EXACT SYNTAX REQUIREMENTS:
- Maps: (define-map name {key: type} {value: type})
- Map access: (map-get? map-name {key: value})
- Map set: (map-set map-name {key: value1} {value: value2})
- Get tuple field: (get field-name tuple-value)
- NFT definition: (define-non-fungible-token name uint)
- Let binding: (let ((var-name value)) ...)

RETURN ONLY CLARITY CODE - NO EXPLANATIONS`;

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

// Explanation endpoint - explains generated Clarity code
app.post("/explain", async (req, res) => {
  try {
    const { clarity_code } = req.body;

    if (!clarity_code) {
      return res.status(400).json({
        status: "error",
        message: "Missing clarity_code in request body",
      });
    }

    // System prompt for explaining Clarity code
    const EXPLANATION_PROMPT = `You are a Clarity smart contract expert. Analyze the provided Clarity code and provide a detailed, educational breakdown.

EXPLANATION FORMAT:
1. **Contract Overview**: Brief summary of what this contract does
2. **Token/NFT Definition**: Explain any token definitions (define-fungible-token, define-non-fungible-token)
3. **Data Storage**: Break down all define-data-var and define-map declarations
4. **Functions**: For each function, explain:
   - Purpose and functionality
   - Parameters and their types
   - Logic flow step by step
   - Return values
5. **Key Clarity Concepts**: Explain important Clarity-specific concepts used

STYLE:
- Use clear, educational language
- Include code snippets with explanations
- Explain Clarity-specific syntax and concepts
- Be thorough but accessible
- Use bullet points and sections for readability

FOCUS ON:
- How data is stored and accessed
- Function logic and flow
- Clarity-specific patterns (map-get?, var-set, asserts!, etc.)
- Security considerations
- Best practices demonstrated`;

    // Send to Groq API for explanation
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: EXPLANATION_PROMPT,
        },
        {
          role: "user",
          content: `Please explain this Clarity smart contract code in detail:

\`\`\`clarity
${clarity_code}
\`\`\``,
        },
      ],
      model: "llama3-8b-8192",
      temperature: 0.3,
      max_tokens: 3000,
    });

    const explanation = completion.choices[0]?.message?.content;

    if (!explanation) {
      return res.status(500).json({
        status: "error",
        message: "Failed to get explanation from AI",
      });
    }

    // Check if request wants plain text
    const acceptHeader = req.headers.accept || "";
    const userAgent = req.headers["user-agent"] || "";

    if (acceptHeader.includes("text/plain") || userAgent.includes("curl")) {
      res.setHeader("Content-Type", "text/plain");
      return res.send(explanation);
    }

    // Return JSON response
    res.json({
      status: "success",
      explanation: explanation,
      clarity_code: clarity_code,
    });
  } catch (error) {
    console.error("Explanation error:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error during explanation",
    });
  }
});

// Combined convert and explain endpoint
app.post("/convert-explain", async (req, res) => {
  try {
    const { solidity_code } = req.body;

    if (!solidity_code) {
      return res.status(400).json({
        status: "error",
        message: "Missing solidity_code in request body",
      });
    }

    // First, convert the Solidity code (reusing existing logic)
    const conversionCompletion = await groq.chat.completions.create({
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

    const clarityCode = conversionCompletion.choices[0]?.message?.content;

    if (!clarityCode) {
      return res.status(500).json({
        status: "error",
        message: "Failed to convert Solidity code",
      });
    }

    // Clean the converted code
    let cleanCode = clarityCode;
    cleanCode = cleanCode.replace(/```clarity\n?/g, "").replace(/```\n?/g, "");
    cleanCode = cleanCode.replace(/^Here is the converted.*?:\s*/i, "");
    cleanCode = cleanCode.replace(/^.*?converted.*?code.*?:\s*/i, "");
    cleanCode = cleanCode.replace(/Note:.*$/gm, "");
    cleanCode = cleanCode.replace(/^.*?explanation.*?$/gm, "");
    cleanCode = cleanCode.trim();

    // Format the code
    const formattedCode = cleanCode
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        if (line.startsWith("(") && !line.startsWith("(define")) {
          return "  " + line;
        }
        return line;
      })
      .join("\n")
      .replace(/\)\n\n\(/g, ")\n\n(")
      .replace(/\n{3,}/g, "\n\n");

    // Now explain the converted code
    const EXPLANATION_PROMPT = `You are a Clarity smart contract expert. Analyze the provided Clarity code and provide a detailed, educational breakdown.

EXPLANATION FORMAT:
1. **Contract Overview**: Brief summary of what this contract does
2. **Token/NFT Definition**: Explain any token definitions (define-fungible-token, define-non-fungible-token)
3. **Data Storage**: Break down all define-data-var and define-map declarations
4. **Functions**: For each function, explain:
   - Purpose and functionality
   - Parameters and their types
   - Logic flow step by step
   - Return values
5. **Key Clarity Concepts**: Explain important Clarity-specific concepts used

STYLE:
- Use clear, educational language
- Include code snippets with explanations
- Explain Clarity-specific syntax and concepts
- Be thorough but accessible
- Use bullet points and sections for readability`;

    const explanationCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: EXPLANATION_PROMPT,
        },
        {
          role: "user",
          content: `Please explain this Clarity smart contract code that was converted from Solidity:

Original Solidity:
\`\`\`solidity
${solidity_code}
\`\`\`

Converted Clarity:
\`\`\`clarity
${formattedCode}
\`\`\``,
        },
      ],
      model: "llama3-8b-8192",
      temperature: 0.3,
      max_tokens: 3000,
    });

    const explanation = explanationCompletion.choices[0]?.message?.content;

    if (!explanation) {
      return res.status(500).json({
        status: "error",
        message: "Failed to generate explanation",
      });
    }

    // Check if request wants plain text
    const acceptHeader = req.headers.accept || "";
    const userAgent = req.headers["user-agent"] || "";

    if (acceptHeader.includes("text/plain") || userAgent.includes("curl")) {
      res.setHeader("Content-Type", "text/plain");
      return res.send(`CONVERTED CLARITY CODE:
${formattedCode}

EXPLANATION:
${explanation}`);
    }

    // Return JSON response
    res.json({
      status: "success",
      solidity_code: solidity_code,
      clarity_code: formattedCode,
      explanation: explanation,
    });
  } catch (error) {
    console.error("Convert-explain error:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error during conversion and explanation",
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
  console.log(`Plain text convert: http://localhost:${PORT}/convert/plain`);
  console.log(`Explain endpoint: http://localhost:${PORT}/explain`);
  console.log(`Convert + Explain: http://localhost:${PORT}/convert-explain`);
});

module.exports = app;
